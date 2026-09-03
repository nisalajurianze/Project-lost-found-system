import { runGoldenEvals } from '../evals/runGoldenEvals.js';

const report = runGoldenEvals();
console.log(JSON.stringify(report, null, 2));
if (report.failed > 0) process.exitCode = 1;
