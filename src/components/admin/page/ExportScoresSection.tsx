import { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Button, Stack, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { getAvailableSessions, exportSessionScores, deleteSession, toastApp } from "../../../api";

export const ExportScoresSection = () => {
  const [sessions, setSessions] = useState<Array<{ sessionId: number; teamId: number; teamName: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [exportingSession, setExportingSession] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await getAvailableSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
      toastApp("Không thể tải danh sách phiên thi", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (sessionId: number, format: "csv" | "excel") => {
    try {
      setExportingSession(sessionId);
      await exportSessionScores(sessionId, format);
      toastApp(`Đã xuất điểm phiên ${sessionId} thành công`, "success");
    } catch (err) {
      console.error(err);
      toastApp("Lỗi khi xuất điểm", "error");
    } finally {
      setExportingSession(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSession(sessionToDelete);
      toastApp(`Đã xóa dữ liệu phiên thi số ${sessionToDelete} thành công`, "success");
      await fetchSessions();
    } catch (err) {
      console.error(err);
      toastApp("Lỗi khi xóa phiên thi", "error");
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const HH = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const YYYY = d.getFullYear();
    return `${HH}:${mm}, ${DD}/${MM}/${YYYY}`;
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ color: "#0F6B6D", fontWeight: 700, mb: 1 }}>
            Xuất Điểm Thi
          </Typography>
          <Typography variant="body2" sx={{ color: "#4A7A8A", mb: 3 }}>
            Chọn phiên thi để xuất danh sách điểm của tất cả thí sinh đã tham gia trong phiên đó.
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} sx={{ color: "#1A8C8E" }} />
            </Box>
          ) : sessions.length === 0 ? (
            <Typography variant="body2" sx={{ textAlign: "center", color: "#64748B", py: 4 }}>
              Chưa có dữ liệu phiên thi nào.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {sessions.map((session) => (
                <Box
                  key={session.sessionId}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid rgba(26,140,142,0.15)",
                    bgcolor: "rgba(255,255,255,0.5)"
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: "#1A3A4A" }}>
                      Phiên thi số {session.sessionId} - {session.teamName}
                    </Typography>
                    <Typography sx={{ fontSize: "0.85rem", color: "#4A7A8A", mt: 0.5 }}>
                      {formatDateTime(session.createdAt)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon fontSize="small" />}
                      disabled={exportingSession === session.sessionId}
                      onClick={() => handleExport(session.sessionId, "csv")}
                      sx={{
                        color: "#0F6B6D",
                        borderColor: "rgba(26,140,142,0.5)",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#1A8C8E",
                          bgcolor: "rgba(26,140,142,0.04)"
                        }
                      }}
                    >
                      CSV
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon fontSize="small" />}
                      disabled={exportingSession === session.sessionId}
                      onClick={() => handleExport(session.sessionId, "excel")}
                      sx={{
                        bgcolor: "#1A8C8E",
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "#0F6B6D",
                          boxShadow: "none"
                        }
                      }}
                    >
                      {exportingSession === session.sessionId ? "Đang xuất..." : "Excel"}
                    </Button>
                    <Tooltip title="Xóa phiên thi này">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={exportingSession === session.sessionId || isDeleting}
                        onClick={() => setSessionToDelete(session.sessionId)}
                        sx={{ ml: 1, bgcolor: "rgba(211,47,47,0.05)" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={sessionToDelete !== null} onClose={() => !isDeleting && setSessionToDelete(null)}>
        <DialogTitle>Xóa phiên thi</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa toàn bộ dữ liệu trả lời của phiên thi số <b>{sessionToDelete}</b> không? Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={isDeleting} onClick={() => setSessionToDelete(null)}>Hủy</Button>
          <Button disabled={isDeleting} onClick={handleDeleteSession} color="error" autoFocus>
            {isDeleting ? "Đang xóa..." : "Xóa phiên thi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
