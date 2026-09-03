const emit = (level, event, extra = {}) => {
  const row = { at: new Date().toISOString(), level, event, ...extra };
  process.stdout.write(`${JSON.stringify(row)}\n`);
};

export const log = {
  info: (event, extra) => emit('info', event, extra),
  warn: (event, extra) => emit('warn', event, extra),
  error: (event, extra) => emit('error', event, extra)
};
