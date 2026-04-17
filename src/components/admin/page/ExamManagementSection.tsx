import { Box, Button, Card, CardContent, Chip, IconButton, List, ListItemButton, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import type { AdminQuestion, ExamSet } from "../../../types/admin";

type Props = {
  examSets: ExamSet[];
  questions: AdminQuestion[];
  selectedExamSetId: number | null;
  selectedQuestionId: number | null;
  onOpenCreateExamSet: () => void;
  onSelectExamSet: (id: number) => Promise<void>;
  onEditExamSet: (id: number, name: string) => void;
  onDeleteExamSet: (id: number, name: string) => Promise<void>;
  onOpenCreateQuestion: () => void;
  onSelectQuestion: (id: number) => void;
  onEditQuestion: (question: AdminQuestion) => void;
  onDeleteQuestion: (question: AdminQuestion) => Promise<void>;
};

export const ExamManagementSection = ({
  examSets,
  questions,
  selectedExamSetId,
  selectedQuestionId,
  onOpenCreateExamSet,
  onSelectExamSet,
  onEditExamSet,
  onDeleteExamSet,
  onOpenCreateQuestion,
  onSelectQuestion,
  onEditQuestion,
  onDeleteQuestion
}: Props) => (
  <Stack spacing={2}>
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F6B6D", mb: 1.5 }}>Quản lý bộ đề</Typography>
        <Button
          variant="contained"
          onClick={onOpenCreateExamSet}
          sx={{ mb: 2, background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}
        >
          + Tạo bộ đề mới
        </Button>
        <List sx={{ border: "1px solid rgba(184,217,236,0.3)", borderRadius: 2 }}>
          {examSets.map((s) => (
            <ListItemButton
              key={s.id}
              selected={selectedExamSetId === s.id}
              onClick={() => void onSelectExamSet(s.id)}
              sx={{ borderLeft: selectedExamSetId === s.id ? "4px solid #1A8C8E" : "4px solid transparent", "&.Mui-selected": { bgcolor: "rgba(26,140,142,0.06)" } }}
            >
              <ListItemText primary={s.name} />
              <Tooltip title="Sửa bộ đề">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditExamSet(s.id, s.name);
                  }}
                  sx={{ color: "#1A8C8E" }}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Xóa bộ đề">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDeleteExamSet(s.id, s.name);
                  }}
                  sx={{ color: "#DC2626" }}
                >
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemButton>
          ))}
        </List>
      </CardContent>
    </Card>

    {selectedExamSetId && (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F6B6D" }}>Câu hỏi ({questions.length})</Typography>
            <Button
              variant="contained"
              size="small"
              onClick={onOpenCreateQuestion}
              sx={{ background: "linear-gradient(135deg, #D4A741, #E88B3A)", "&:hover": { background: "linear-gradient(135deg, #B8922E, #D4A741)" } }}
            >
              + Tạo câu hỏi
            </Button>
          </Box>
          <Box sx={{ border: "1px solid rgba(184,217,236,0.3)", borderRadius: 2, maxHeight: 500, overflow: "auto", p: 1, display: "grid", gap: 1 }}>
            {questions.map((q) => {
              const isSelected = selectedQuestionId === q.id;
              return (
                <Box
                  key={q.id}
                  onClick={() => onSelectQuestion(q.id)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    border: isSelected ? "1px solid rgba(26,140,142,0.45)" : "1px solid rgba(184,217,236,0.35)",
                    bgcolor: isSelected ? "rgba(26,140,142,0.08)" : "#FFFFFF",
                    transition: "all 0.15s ease",
                    "&:hover": { bgcolor: "rgba(26,140,142,0.05)" }
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: "#1A3A4A", mb: 1 }}>{`Câu ${q.orderNum}: ${q.content}`}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <Stack direction="row" spacing={1}>
                      <Chip size="small" label={q.type} sx={{ fontWeight: 700 }} />
                      <Chip size="small" label={`${q.countdownSeconds}s`} />
                      <Chip size="small" label={`${q.score} điểm`} />
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Sửa câu hỏi">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditQuestion(q);
                          }}
                          sx={{ color: "#1A8C8E" }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa câu hỏi">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDeleteQuestion(q);
                          }}
                          sx={{ color: "#DC2626" }}
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    )}
  </Stack>
);
