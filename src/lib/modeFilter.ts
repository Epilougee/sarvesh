export function isSchoolGroup(name: string): boolean {
  return /^(Class|Grade)\s/i.test(name.trim());
}

export function filterGroupsByMode<T extends { name: string }>(
  groups: T[],
  mode: "college" | "school"
): T[] {
  if (mode === "school") {
    const filtered = groups.filter((g) => isSchoolGroup(g.name));
    // Sort Class 1..12 naturally (Class 1, Class 2, ... Class 10, Class 11, Class 12)
    return filtered.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ""), 10);
      const numB = parseInt(b.name.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });
  }
  return groups.filter((g) => !isSchoolGroup(g.name));
}

export function isSchoolSubject(code: string): boolean {
  return (
    /-(PRI|MID|SEC|SR|ALL)$/.test(code) ||
    /^(MATH-SEC|SCI-PRI|PHY-SR|CHEM-SR|BIO-SR|ENG-ALL|SST-MID|COMP-SEC|HIN-ALL)$/i.test(code)
  );
}

export function filterSubjectsByMode<T extends { code: string; name?: string }>(
  subjects: T[],
  mode: "college" | "school"
): T[] {
  if (mode === "school") {
    return subjects.filter((s) => isSchoolSubject(s.code));
  }
  return subjects.filter((s) => !isSchoolSubject(s.code));
}
