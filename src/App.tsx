import { Navigate, Route, Routes } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type { ReactElement } from "react";

type PlaceholderPageProps = {
  title: string;
};

const PlaceholderPage = ({ title }: PlaceholderPageProps) => (
  <Box sx={{ p: 4 }}>
    <Typography variant="h4">{title}</Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      Sprint 1 foundation is ready. UI modules will be implemented in next sprints.
    </Typography>
  </Box>
);

function App(): ReactElement {
  return (
    <Routes>
      <Route path="/admin/*" element={<PlaceholderPage title="Admin Panel" />} />
      <Route path="/contestant/*" element={<PlaceholderPage title="Contestant App" />} />
      <Route path="/led" element={<PlaceholderPage title="LED Screen" />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;
