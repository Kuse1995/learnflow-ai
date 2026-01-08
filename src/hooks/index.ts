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

// Usage limits and billing
export {
  useSchoolBilling,
  useSchoolUsageMetrics,
  useUsageLimit,
  useAllUsageLimits,
  useCanPerformAction,
} from "./useUsageLimits";

// Parent permissions
export {
  useParentPermission,
  useGuardianPermissions,
  useStudentGuardianPermissions,
  useGrantPermission,
  useRevokePermission,
  useCanAccessFeature,
  useAccessibleStudents,
  useCurrentParentPermissions,
} from "./useParentPermissions";

// Term closure
export {
  useIsTermClosed,
  useTermClosure,
  useSchoolTermClosures,
  useTermSummary,
  useCloseTerm,
  getTermLabel,
  formatClosureDate,
} from "./useTermClosure";

// Utility hooks
export { useIsMobile } from "./use-mobile";

// Permission guard hooks
export {
  usePermissionGuard,
  useActionVisibility,
  useScopeGuard,
} from "./usePermissionGuard";

// Demo safety hooks
export {
  useIsDemoSchool,
  useIsDemoClass,
  useDemoBadgeConfig,
  useDemoDataSummary,
  useResetDemoData,
  useDeleteDemoSchool,
  useShouldSuppressNotifications,
  isDemoSchool,
  isDemoClass,
  isDemoStudent,
  DELETE_DEMO_CONFIRMATION_PHRASE,
} from "./useDemoSafety";

// Platform Owner (unrestricted access)
export {
  usePlatformOwner,
  isPlatformOwnerEmail,
  PLATFORM_OWNER_EMAIL,
} from "./usePlatformOwner";
