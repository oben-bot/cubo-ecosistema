import { HashRouter as Router } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './components/ThemeManager/ThemeProvider';

export default function Main() {
  return (
    <ThemeProvider>
      <Router>
        <App />
      </Router>
    </ThemeProvider>
  );
}
