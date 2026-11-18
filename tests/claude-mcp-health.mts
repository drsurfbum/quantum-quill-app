// Optional Claude Code health check only, not Claude Desktop or a model/tool turn.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp,writeFile,mkdir,rm } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
const binary=process.env.QQ_CLAUDE_BIN;
if(!binary)throw new Error('Set QQ_CLAUDE_BIN to an installed Claude Code executable.');
const temporary=await mkdtemp(join(tmpdir(),'qq-claude-health-'));
try{
 const config=join(temporary,'.claude.json');
 // The handshake exposes only tool schemas/documentation. This syntactically
 // valid fixture token has no backing app or account and is never displayed.
 await writeFile(config,JSON.stringify({mcpServers:{quantum_quill:{command:process.execPath,args:[resolve('dist/mcp-bundle.cjs')],env:{QQ_MCP_ORIGIN:'http://127.0.0.1:9',QQ_MCP_TOKEN:'qqmcp_1_'+'x'.repeat(43)}}}}),{mode:0o600});
 const child=spawn(binary,['--bare','mcp','list'],{cwd:temporary,env:{PATH:process.env.PATH!,HOME:process.env.HOME!,TMPDIR:tmpdir(),CLAUDE_CONFIG_DIR:temporary,CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'},stdio:['ignore','pipe','pipe']});
 let output='',diagnostic='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>diagnostic+=b);const timeout=setTimeout(()=>child.kill('SIGTERM'),20000);const [code]=await once(child,'exit');clearTimeout(timeout);
 assert.equal(code,0,diagnostic.replaceAll(temporary,'<temporary>').replace(/qqmcp_[0-9]+_[A-Za-z0-9_-]{43}/g,'<fixture-key>'));assert(/quantum_quill.*Connected/s.test(output),'Claude Code must report the isolated QQ server connected: '+output.replaceAll(temporary,'<temporary>').replace(/qqmcp_[0-9]+_[A-Za-z0-9_-]{43}/g,'<fixture-key>'));
 const receipt={client:'installed Claude Code; no account or model call',handshake:true,toolCalls:false,desktopExtensionInstallation:false,realCredentialsUsed:false};
 await mkdir('.local/mcp-release-review',{recursive:true});await writeFile('.local/mcp-release-review/claude-health.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{await rm(temporary,{recursive:true,force:true});}
