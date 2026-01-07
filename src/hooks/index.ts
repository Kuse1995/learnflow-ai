// Attendance hooks
export { useAttendanceByClassAndDate, useSaveAttendance, useStudentAttendanceHistory } from "./useAttendance";

// Class hooks
export { useClasses, useClass } from "./useClasses";

// Student hooks
export { useStudents, useStudentsByClass } from "./useStudents";

// Upload hooks
export { useUploads, useUploadFile, useDeleteUpload } from "./useUploads";
export { useUploadsByClass } from "./useUploadsByClass";
export { useAnalyzeUpload, useUploadAnalysis, useClassAnalyses } from "./useUploadAnalysis";

// Class attendance history
export { useClassAttendanceHistory } from "./useClassAttendanceHistory";

// Student learning profiles
export { useStudentLearningProfile } from "./useStudentLearningProfile";

// Teaching suggestions
export { useTeachingSuggestions } from "./useTeachingSuggestions";

// Data readiness
export { useClassDataReadiness, useStudentDataReadiness } from "./useDataReadiness";

// Utility hooks
export { useIsMobile } from "./use-mobile";
