import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

type Props = {
  rulesDraft: string;
  ledBackgroundDraft: string;
  contestantBackgroundDraft: string;
  isRulesLoading: boolean;
  isSavingRules: boolean;
  onRulesDraftChange: (value: string) => void;
  onSaveRules: () => Promise<void>;
  onShowRulesOnLed: () => Promise<void> | void;
  onReloadRules: () => Promise<void> | void;
};

export const RulesSection = ({
  rulesDraft,
  ledBackgroundDraft,
  contestantBackgroundDraft,
  isRulesLoading,
  isSavingRules,
  onRulesDraftChange,
  onSaveRules,
  onShowRulesOnLed,
  onReloadRules
}: Props) => (
  <Card>
    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F6B6D" }}>
          Nội dung thể lệ cuộc thi
        </Typography>
        <TextField
          multiline
          rows={12}
          value={rulesDraft}
          onChange={(e) => onRulesDraftChange(e.target.value)}
          placeholder="Nhập thể lệ cuộc thi để hiển thị trên màn hình LED..."
          fullWidth
          disabled={isRulesLoading || isSavingRules}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="contained"
            onClick={() => void onSaveRules()}
            disabled={isRulesLoading || isSavingRules}
            sx={{ background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}
          >
            Lưu thể lệ
          </Button>
          <Button
            variant="outlined"
            onClick={() => void onShowRulesOnLed()}
            disabled={isSavingRules}
            sx={{ borderColor: "#D4A741", color: "#D4A741", "&:hover": { borderColor: "#B8922E", bgcolor: "rgba(212,167,65,0.06)" } }}
          >
            Hiển thị lên LED
          </Button>
          <Button variant="text" onClick={() => void onReloadRules()} disabled={isRulesLoading || isSavingRules}>
            Tải lại
          </Button>
        </Stack>
        <Typography variant="caption" sx={{ color: "#64748B" }}>
          Nền LED hiện tại: {ledBackgroundDraft || "(chưa có)"} | Nền thí sinh: {contestantBackgroundDraft || "(chưa có)"}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);
