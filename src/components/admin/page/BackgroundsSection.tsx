import { Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

type Props = {
  ledBackgroundDraft: string;
  contestantBackgroundDraft: string;
  isUploadingLedBg: boolean;
  isUploadingContestantBg: boolean;
  isSavingRules: boolean;
  onUploadLedBackground: (file: File) => Promise<void>;
  onUploadContestantBackground: (file: File) => Promise<void>;
  onSaveBackgrounds: () => Promise<void>;
};

export const BackgroundsSection = ({
  ledBackgroundDraft,
  contestantBackgroundDraft,
  isUploadingLedBg,
  isUploadingContestantBg,
  isSavingRules,
  onUploadLedBackground,
  onUploadContestantBackground,
  onSaveBackgrounds
}: Props) => (
  <Card>
    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F6B6D" }}>
          Hình nền LED và thí sinh
        </Typography>
        <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
          Tách riêng hai nền: màn LED và máy thí sinh. Sau khi tải ảnh, bấm Lưu cấu hình.
        </Typography>
        <TextField value={ledBackgroundDraft} label="URL nền LED" fullWidth disabled />
        <Button variant="outlined" component="label" startIcon={<TvRoundedIcon />} disabled={isUploadingLedBg}>
          {isUploadingLedBg ? "Đang tải..." : "Tải ảnh nền LED"}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onUploadLedBackground(file);
              e.currentTarget.value = "";
            }}
          />
        </Button>
        <TextField value={contestantBackgroundDraft} label="URL nền thí sinh" fullWidth disabled />
        <Button variant="outlined" component="label" startIcon={<PersonRoundedIcon />} disabled={isUploadingContestantBg}>
          {isUploadingContestantBg ? "Đang tải..." : "Tải ảnh nền thí sinh"}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onUploadContestantBackground(file);
              e.currentTarget.value = "";
            }}
          />
        </Button>
        <Button
          variant="contained"
          disabled={isSavingRules}
          onClick={() => void onSaveBackgrounds()}
          sx={{ background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", alignSelf: "flex-start" }}
        >
          Lưu cấu hình nền
        </Button>
      </Stack>
    </CardContent>
  </Card>
);
