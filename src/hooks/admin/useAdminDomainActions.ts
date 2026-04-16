import { api, toastApp } from "../../api";
import type { AdminQuestion } from "../../types/admin";

type AuthHeaders = {
  headers: {
    Authorization: string;
  };
};

type ToastSetter = (value: { open: boolean; message: string }) => void;

export const useTeamActions = ({
  teamName,
  authHeaders,
  adminToken,
  loadCoreData,
  setTeamName,
  setToast
}: {
  teamName: string;
  authHeaders: AuthHeaders;
  adminToken: string | null;
  loadCoreData: (token: string) => Promise<void>;
  setTeamName: (value: string) => void;
  setToast: ToastSetter;
}) => {
  const onAddTeam = async (): Promise<void> => {
    await api.post("/teams", { name: teamName }, authHeaders);
    setTeamName("");
    if (adminToken) await loadCoreData(adminToken);
  };

  const onEditTeam = async (teamId: number, name: string): Promise<void> => {
    await api.put(`/teams/${teamId}`, { name }, authHeaders);
    if (adminToken) await loadCoreData(adminToken);
    setToast({ open: true, message: "Đã cập nhật tên đội" });
  };

  const onDeleteTeam = async (teamId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}`, authHeaders);
    if (adminToken) await loadCoreData(adminToken);
    setToast({ open: true, message: "Đã xóa đội" });
  };

  const onAssignContestantsToTeam = async (teamId: number, contestantIds: number[]): Promise<void> => {
    await Promise.all(
      contestantIds.map((contestantId) =>
        api.put(
          `/contestants/${contestantId}`,
          {
            teamId
          },
          authHeaders
        )
      )
    );
    if (adminToken) await loadCoreData(adminToken);
  };

  return { onAddTeam, onEditTeam, onDeleteTeam, onAssignContestantsToTeam };
};

export const useContestantActions = ({
  bulkTeamTarget,
  selectedContestantIds,
  authHeaders,
  adminToken,
  loadCoreData,
  setSelectedContestantIds,
  setBulkTeamTarget,
  contestantCode,
  contestantPassword,
  contestantName,
  setContestantName,
  setContestantCode,
  setContestantPassword,
  setToast
}: {
  bulkTeamTarget: number | "";
  selectedContestantIds: number[];
  authHeaders: AuthHeaders;
  adminToken: string | null;
  loadCoreData: (token: string) => Promise<void>;
  setSelectedContestantIds: (ids: number[]) => void;
  setBulkTeamTarget: (value: number | "") => void;
  contestantCode: string;
  contestantPassword: string;
  contestantName: string;
  setContestantName: (value: string) => void;
  setContestantCode: (value: string) => void;
  setContestantPassword: (value: string) => void;
  setToast: ToastSetter;
}) => {
  const onBulkAssignTeam = async (): Promise<void> => {
    if (bulkTeamTarget === "" || selectedContestantIds.length === 0) return;
    await api.put("/contestants/bulk-team", { contestantIds: selectedContestantIds, teamId: bulkTeamTarget }, authHeaders);
    setSelectedContestantIds([]);
    setBulkTeamTarget("");
    if (adminToken) await loadCoreData(adminToken);
    toastApp("Đã gán đội cho thí sinh", "success");
  };

  const onImportExcel = async (file: File): Promise<void> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/contestants/import-excel", fd, {
      ...authHeaders,
      headers: { ...authHeaders.headers, "Content-Type": "multipart/form-data" }
    });
    const { created, skipped } = res.data.data as { created: number; skipped: number };
    if (adminToken) await loadCoreData(adminToken);
    toastApp(`Import xong: tạo ${created}, bỏ qua ${skipped}. File Excel cần có cột mật khẩu.`, "success");
  };

  const onAddContestant = async (): Promise<void> => {
    await api.post(
      "/contestants",
      {
        teamId: null,
        code: contestantCode,
        password: contestantPassword,
        name: contestantName
      },
      authHeaders
    );
    setContestantName("");
    setContestantCode("");
    setContestantPassword("");
    if (adminToken) await loadCoreData(adminToken);
  };

  const onEditContestant = async (
    id: number,
    data: { name: string; code: string; unit: string | null; teamId: number | null }
  ): Promise<void> => {
    await api.put(`/contestants/${id}`, data, authHeaders);
    if (adminToken) await loadCoreData(adminToken);
    setToast({ open: true, message: "Đã cập nhật thí sinh" });
  };

  const onDeleteContestant = async (id: number): Promise<void> => {
    await api.delete(`/contestants/${id}`, authHeaders);
    if (adminToken) await loadCoreData(adminToken);
    setToast({ open: true, message: "Đã xóa thí sinh" });
  };

  return { onBulkAssignTeam, onImportExcel, onAddContestant, onEditContestant, onDeleteContestant };
};

export const useExamActions = ({
  authHeaders,
  adminToken,
  loadCoreData,
  loadQuestions,
  selectedExamSetId,
  selectedQuestionId,
  setSelectedExamSetId,
  setQuestions,
  setToast,
  setSelectedQuestionId
}: {
  authHeaders: AuthHeaders;
  adminToken: string | null;
  loadCoreData: (token: string) => Promise<void>;
  loadQuestions: (examSetId: number, token?: string) => Promise<void>;
  selectedExamSetId: number | null;
  selectedQuestionId: number | null;
  setSelectedExamSetId: (value: number | null) => void;
  setQuestions: (questions: AdminQuestion[]) => void;
  setToast: ToastSetter;
  setSelectedQuestionId: (id: number | null) => void;
}) => {
  const onSelectExamSet = async (id: number): Promise<void> => {
    setSelectedExamSetId(id);
    await loadQuestions(id);
  };

  const onDeleteExamSet = async (id: number, name: string): Promise<void> => {
    if (!window.confirm(`Xóa bộ đề "${name}"?`)) return;
    await api.delete(`/exam-sets/${id}`, authHeaders);
    if (adminToken) await loadCoreData(adminToken);
    if (selectedExamSetId === id) {
      setSelectedExamSetId(null);
      setQuestions([]);
    }
    setToast({ open: true, message: "Đã xóa bộ đề" });
  };

  const onDeleteQuestion = async (q: AdminQuestion): Promise<void> => {
    if (!selectedExamSetId) return;
    if (!window.confirm(`Xóa câu "${q.content}"?`)) return;
    await api.delete(`/questions/${q.id}`, authHeaders);
    await loadQuestions(selectedExamSetId);
    if (selectedQuestionId === q.id) setSelectedQuestionId(null);
    setToast({ open: true, message: "Đã xóa câu hỏi" });
  };

  return { onSelectExamSet, onDeleteExamSet, onDeleteQuestion };
};
