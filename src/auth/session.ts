export const clearAllSessions = (): void => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("contestantToken");
  localStorage.removeItem("contestantProfile");
};
