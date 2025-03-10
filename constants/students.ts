export interface StudentData {
  rollNo: string;
  name: string;
  class: string;
  section: string;
}

export const STUDENTS: StudentData[] = Array.from({ length: 70 }, (_, i) => ({
  rollNo: `23BCS${String(i + 1).padStart(3, '0')}`, // This creates 23BCS001, 23BCS002, etc.
  name: `Student ${i + 1}`,
  class: "CSE",
  section: "A"
}));

export const getStudentByRollNo = (rollNo: string): StudentData | undefined => {
  // Normalize the roll number format (uppercase and trim)
  const normalizedInput = rollNo.toUpperCase().trim();
  // Validate format
  const isValidFormat = /^23BCS\d{3}$/.test(normalizedInput);
  if (!isValidFormat) return undefined;
  
  return STUDENTS.find(student => student.rollNo === normalizedInput);
};

export const getStudentsByClass = (className: string, section: string): StudentData[] => {
  return STUDENTS.filter(
    student => student.class === className && student.section === section
  );
};
