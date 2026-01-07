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

// Teacher action logs
export { useCreateActionLog, useClassActionLogs, useUploadActionLogs, useUpdateActionLog, useDeleteActionLog } from "./useTeacherActionLogs";

// Learning patterns
export { useLearningPatterns } from "./useLearningPatterns";

// Parent insights
export {
  useDraftParentInsights,
  useStudentDraftInsight,
  useApprovedParentInsight,
  useGenerateParentInsight,
  useUpdateParentInsight,
  useApproveParentInsight,
  useDeleteParentInsight,
} from "./useParentInsights";

// Adaptive support plans (formerly intervention plans)
export {
  useClassAdaptiveSupportPlans,
  useStudentAdaptiveSupportPlan,
  useCanGenerateAdaptiveSupportPlan,
  useGenerateAdaptiveSupportPlan,
  useAcknowledgeAdaptiveSupportPlan,
  // Deprecated aliases for backward compatibility
  useClassInterventionPlans,
  useStudentInterventionPlan,
  useGenerateInterventionPlan,
  useAcknowledgeInterventionPlan,
} from "./useAdaptiveSupportPlans";

// Learning paths (teacher-facing only)
export {
  useClassLearningPaths,
  useStudentLearningPath,
  useCanGenerateLearningPath,
  useGenerateLearningPath,
  useAcknowledgeLearningPath,
} from "./useLearningPaths";

// Lesson differentiation
export {
  useLessonSuggestions,
  useLessonSuggestion,
  useLessonResources,
  useGenerateLessonSuggestion,
  useMarkLessonReviewed,
  useAddLessonResource,
  useDeleteLessonResource,
  useDuplicateLessonSuggestion,
} from "./useLessonDifferentiation";

// Practice
export {
  useGeneratePractice,
  useStartPracticeSession,
  useCompletePracticeSession,
} from "./usePractice";

// Practice awareness (teacher view)
export {
  useClassPracticeAwareness,
  formatPracticeLevel,
  formatPlanStatus,
  formatGentleNudge,
} from "./usePracticeAwareness";

// School plan and feature gates
export { useSchoolPlan, useSchoolPlanByClass } from "./useSchoolPlan";
export { useFeatureGate, useFeatureGates } from "./useFeatureGate";

// Utility hooks
export { useIsMobile } from "./use-mobile";
