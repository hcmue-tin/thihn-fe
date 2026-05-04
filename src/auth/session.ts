export const clearAllSessions = (): void => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("contestantToken");
  localStorage.removeItem("contestantProfile");
  Object.keys(localStorage)
    .filter((key) => key.startsWith("contestantDraft:") || key.startsWith("contestantPendingSubmit:"))
    .forEach((key) => localStorage.removeItem(key));
};
