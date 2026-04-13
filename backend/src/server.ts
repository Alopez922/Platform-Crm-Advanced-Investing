import app from './app';
import { env } from './config/env';
import { startSheetsAutoSync } from './jobs/sheetsAutoSync';
import { startSequenceScheduler } from './jobs/sequenceScheduler';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚀 LeadPilot Backend                  ║
  ║   Puerto: ${PORT}                          ║
  ║   Entorno: ${env.NODE_ENV.padEnd(28)}║
  ║   API: http://localhost:${PORT}/api        ║
  ╚══════════════════════════════════════════╝
  `);

  // Iniciar jobs automáticos
  startSheetsAutoSync();
  startSequenceScheduler();
});

