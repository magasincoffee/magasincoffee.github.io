const SOURCE_LABEL =
  "get_workforce_staffing_requirements + list_schedule_generations + get_schedule_generation_assignments";

const ACTIVE_GENERATION_STATUSES = new Set(["DRAFT", "REVIEWED"]);

function dateKey(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function timeMinutes(value) {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return hour * 60 + minute;
}

function normalizedSkill(value) {
  const skill = String(value ?? "").trim();
  return skill || null;
}

function activeRequirement(row) {
  const status = String(row?.status ?? "ACTIVE").toUpperCase();
  return status === "ACTIVE";
}

function normalizeMinimum(value) {
  if (value === null || value === undefined || value === "") {
    throw new Error("INVALID_MINIMUM_HEADCOUNT");
  }
  const minimum = Number(value);
  if (!Number.isInteger(minimum) || minimum < 0) {
    throw new Error("INVALID_MINIMUM_HEADCOUNT");
  }
  return minimum;
}

function assignmentCoversRequirement(assignment, requirement) {
  if (dateKey(assignment?.work_date) !== dateKey(requirement?.work_date)) {
    return false;
  }

  const assignmentStart = timeMinutes(assignment?.start_time);
  const assignmentEnd = timeMinutes(assignment?.end_time);
  const requirementStart = timeMinutes(requirement?.start_time);
  const requirementEnd = timeMinutes(requirement?.end_time);

  if (
    assignmentStart === null ||
    assignmentEnd === null ||
    requirementStart === null ||
    requirementEnd === null
  ) {
    throw new Error("INVALID_TIME_RANGE");
  }

  if (assignmentStart > requirementStart || assignmentEnd < requirementEnd) {
    return false;
  }

  const skill = normalizedSkill(requirement?.skill_code);
  if (!skill) return true;

  if (normalizedSkill(assignment?.skill_code) !== skill) {
    return false;
  }

  const minSkillLevel = Number(requirement?.min_skill_level ?? 0);
  if (!Number.isFinite(minSkillLevel) || minSkillLevel < 0) {
    throw new Error("INVALID_MIN_SKILL_LEVEL");
  }

  const assignmentSkillLevel = Number(assignment?.skill_level);
  if (!Number.isFinite(assignmentSkillLevel)) {
    return minSkillLevel === 0;
  }

  return assignmentSkillLevel >= minSkillLevel;
}

export function selectScheduleGeneration(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    rows.find((row) =>
      ACTIVE_GENERATION_STATUSES.has(
        String(row?.status ?? "").toUpperCase()
      )
    ) || rows[0]
  );
}

export function summarizeStaffingGaps({
  requirements = [],
  assignments = []
} = {}) {
  if (!Array.isArray(requirements) || !Array.isArray(assignments)) {
    throw new Error("MALFORMED_STAFFING_SOURCE");
  }

  const gaps = [];

  for (const requirement of requirements.filter(activeRequirement)) {
    const minimum = normalizeMinimum(requirement?.minimum_headcount);
    const workDate = dateKey(requirement?.work_date);
    const startTime = timeMinutes(requirement?.start_time);
    const endTime = timeMinutes(requirement?.end_time);

    if (
      !workDate ||
      startTime === null ||
      endTime === null ||
      endTime <= startTime
    ) {
      throw new Error("INVALID_REQUIREMENT_RANGE");
    }

    let assigned = 0;
    for (const assignment of assignments) {
      if (assignmentCoversRequirement(assignment, requirement)) {
        assigned += 1;
      }
    }

    if (assigned < minimum) {
      gaps.push({
        requirementId: requirement?.id ?? null,
        workDate,
        startTime: String(requirement.start_time).slice(0, 5),
        endTime: String(requirement.end_time).slice(0, 5),
        minimum,
        assigned,
        skillCode: normalizedSkill(requirement?.skill_code)
      });
    }
  }

  return {
    staffingGapCount: gaps.length,
    requirementCount: requirements.filter(activeRequirement).length,
    gaps
  };
}

async function readArrayRpc(core, name, args) {
  const result = await core.supabase.rpc(name, args);
  if (result?.error) throw result.error;
  if (!Array.isArray(result?.data)) {
    throw new Error(`MALFORMED_RPC_RESULT:${name}`);
  }
  return result.data;
}

export async function loadStoreStaffingGap(
  core,
  {
    storeId,
    weekStart = core?.date?.monday?.(),
    generationRows,
    now = () => new Date()
  } = {}
) {
  const asOf = now().toISOString();

  if (!core?.supabase?.rpc || !storeId || !weekStart) {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf,
      staffingGapCount: null,
      message: "Thiếu điều kiện để đọc staffing gap."
    };
  }

  try {
    let generations;
    if (generationRows === undefined) {
      generations = await readArrayRpc(
        core,
        "list_schedule_generations",
        {
          p_store_id: storeId,
          p_week_start: weekStart
        }
      );
    } else {
      if (!Array.isArray(generationRows)) {
        throw new Error("MALFORMED_GENERATION_SOURCE");
      }
      generations = generationRows;
    }

    const generation = selectScheduleGeneration(generations);

    if (!generation?.id) {
      return {
        quality: "GAP",
        source: SOURCE_LABEL,
        asOf,
        staffingGapCount: null,
        message: "Chưa có schedule generation để đối chiếu staffing gap."
      };
    }

    const [requirements, assignments] = await Promise.all([
      readArrayRpc(core, "get_workforce_staffing_requirements", {
        p_store_id: storeId,
        p_week_start: weekStart
      }),
      readArrayRpc(core, "get_schedule_generation_assignments", {
        p_generation_id: generation.id
      })
    ]);

    const summary = summarizeStaffingGaps({
      requirements,
      assignments
    });

    return {
      quality: "ACTUAL",
      source: SOURCE_LABEL,
      asOf,
      staffingGapCount: summary.staffingGapCount,
      requirementCount: summary.requirementCount,
      generationId: generation.id,
      generationStatus: String(generation.status ?? ""),
      message:
        "Staffing gap đối chiếu minimum_headcount với phân công của schedule generation hiện tại."
    };
  } catch {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf,
      staffingGapCount: null,
      message: "Nguồn staffing gap read-only tạm thời không khả dụng."
    };
  }
}

export const STAFFING_GAP_SOURCE_LABEL = SOURCE_LABEL;
