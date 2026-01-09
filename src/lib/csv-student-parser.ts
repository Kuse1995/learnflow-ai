/**
 * CSV Student Parser
 * Parses and validates CSV data for bulk student imports
 */

export interface ParsedStudent {
  name: string;
  studentId: string;
  grade: string | null;
  className: string | null;
  classId: string | null;
  rowNumber: number;
  errors: string[];
  warnings: string[];
}

export interface ParseResult {
  students: ParsedStudent[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  grade: string | null;
}

interface ExistingStudentIds {
  [studentId: string]: boolean;
}

/**
 * Parse CSV text into student data with validation
 */
export function parseStudentCSV(
  csvText: string,
  classes: ClassInfo[],
  existingStudentIds: string[] = []
): ParseResult {
  const lines = csvText.trim().split('\n');
  const students: ParsedStudent[] = [];
  
  if (lines.length === 0) {
    return {
      students: [],
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      warningCount: 0,
    };
  }

  // Build lookup maps
  const existingIds: ExistingStudentIds = {};
  existingStudentIds.forEach(id => {
    existingIds[id.toLowerCase()] = true;
  });

  const classNameMap = new Map<string, ClassInfo>();
  classes.forEach(c => {
    classNameMap.set(c.name.toLowerCase(), c);
  });

  // Track student IDs within this upload for duplicates
  const uploadStudentIds = new Set<string>();

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name') || firstLine.includes('student');
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = parseCSVLine(line);
    const rowNumber = i + 1;

    const student: ParsedStudent = {
      name: parts[0]?.trim() || '',
      studentId: parts[1]?.trim() || '',
      grade: parts[2]?.trim() || null,
      className: parts[3]?.trim() || null,
      classId: null,
      rowNumber,
      errors: [],
      warnings: [],
    };

    // Validation
    if (!student.name) {
      student.errors.push('Name is required');
    }

    // Handle student ID
    if (!student.studentId) {
      student.studentId = generateStudentId();
      student.warnings.push('Student ID auto-generated');
    } else {
      // Check for duplicates in this upload
      const lowerId = student.studentId.toLowerCase();
      if (uploadStudentIds.has(lowerId)) {
        student.errors.push('Duplicate Student ID in this upload');
      } else {
        uploadStudentIds.add(lowerId);
      }

      // Check against existing students
      if (existingIds[lowerId]) {
        student.errors.push('Student ID already exists in database');
      }
    }

    // Match class name
    if (student.className) {
      const matchedClass = classNameMap.get(student.className.toLowerCase());
      if (matchedClass) {
        student.classId = matchedClass.id;
        if (!student.grade && matchedClass.grade) {
          student.grade = matchedClass.grade;
        }
      } else {
        student.warnings.push(`Class "${student.className}" not found - student will be created without class`);
      }
    }

    students.push(student);
  }

  const validCount = students.filter(s => s.errors.length === 0).length;
  const errorCount = students.filter(s => s.errors.length > 0).length;
  const warningCount = students.filter(s => s.warnings.length > 0).length;

  return {
    students,
    totalRows: students.length,
    validCount,
    errorCount,
    warningCount,
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Generate a unique student ID
 */
function generateStudentId(): string {
  const prefix = 'STU';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate CSV template content
 */
export function generateCSVTemplate(): string {
  return `Name,Student ID,Grade,Class Name
John Doe,STU001,Grade 5,5A
Jane Smith,STU002,Grade 5,5B
Mike Johnson,,Grade 6,6A`;
}
