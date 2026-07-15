const fs = require("fs");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurada.");
  process.exit(1);
}

const content = `window.__ENV__ = {
  SUPABASE_URL: ${JSON.stringify(supabaseUrl)},
  SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)}
};
`;

fs.writeFileSync("env.js", content, "utf8");

console.log("env.js gerado com sucesso!");