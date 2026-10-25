import { themeVars } from '../subjects.js';

export default function SubjectTag({ subject }) {
  const theme = themeVars(subject);
  return (
    <span className="subject-tag" style={theme}>
      {subject}
    </span>
  );
}
