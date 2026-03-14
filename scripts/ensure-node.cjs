const requiredMajor = 24;
const requiredVersion = '24.14.0';
const current = process.versions.node;
const currentMajor = Number(current.split('.')[0]);

if (currentMajor !== requiredMajor) {
  console.error('');
  console.error(
    `SHIELD Platform requires Node.js ${requiredVersion}. Current: ${current}.`,
  );
  console.error('Load nvm and switch before running Backstage:');
  console.error('');
  console.error('  . ~/.nvm/nvm.sh');
  console.error(`  nvm use ${requiredVersion}`);
  console.error('');
  process.exit(1);
}
