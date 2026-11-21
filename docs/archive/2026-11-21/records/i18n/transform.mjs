import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const files=['src/components/SiteLayout.tsx','src/components/LibraryShelf.tsx','src/components/BookCover.tsx','src/components/AsyncFeedback.tsx','src/components/PreferenceChoices.tsx','src/pages/HomePage.tsx','src/pages/CanonLibraryPage.tsx','src/pages/BookPage.tsx','src/pages/SearchPage.tsx','src/pages/ReaderPage.tsx','src/pages/NotesPage.tsx','src/pages/StudyPage.tsx','src/pages/ProfilePage.tsx','src/pages/AboutPage.tsx','src/pages/PrivacyPage.tsx','src/pages/NotFoundPage.tsx'];
const hasHan=t=>/[\u3400-\u9fff]/.test(t);
for(const file of files){
 const source=readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 const replace=(node,value)=>edits.push({start:node.getStart(ast),end:node.getEnd(),value});
 function childExpression(node){
  if(ts.isStringLiteral(node)&&hasHan(node.text)){replace(node,`t(${node.getText(ast)})`);return;}
  if(ts.isConditionalExpression(node)){childExpression(node.whenTrue);childExpression(node.whenFalse);return;}
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)){childExpression(node.left);childExpression(node.right);return;}
  if(ts.isPropertyAccessExpression(node)&&['title','scriptureTitle','passageTitle','categoryName','school','dynasty','translator','edition','sourceName','license','summary','role'].includes(node.name.text)){replace(node,`displayText(${node.getText(ast)})`);return;}
 }
 function visit(node){
  if(ts.isJsxText(node)&&hasHan(node.text)){const normalized=node.text.replace(/\r?\n\s*/g,' ').trim();if(normalized)edits.push({start:node.pos,end:node.end,value:`{t(${JSON.stringify(normalized)})}`});return;}
  if(ts.isJsxAttribute(node)&&['placeholder','aria-label','title'].includes(node.name.getText(ast))&&node.initializer&&ts.isStringLiteral(node.initializer)&&hasHan(node.initializer.text)){replace(node.initializer,`{t(${JSON.stringify(node.initializer.text)})}`);return;}
  if(ts.isJsxExpression(node)&&node.expression&&!(ts.isJsxAttribute(node.parent))){childExpression(node.expression);}
  ts.forEachChild(node,visit);
 }
 visit(ast);
 if(!edits.length)continue;
 const functions=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.body&&/^[A-Z]/.test(node.name?.text||''));
 for(const fn of functions)if(edits.some(edit=>edit.start>fn.body.pos&&edit.end<fn.body.end))edits.push({start:fn.body.getStart(ast)+1,end:fn.body.getStart(ast)+1,value:'\n  const { t, displayText } = useI18n();\n'});
 let output=source;for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.value+output.slice(edit.end);
 output=`import { useI18n } from '${file.includes('/components/')?'../lib/i18n':'../lib/i18n'}';\n`+output;
 // Keep only the helpers used in this component scope; lint also catches any missed ones.
 output=output.replace('const { t, displayText } = useI18n();',!output.includes('displayText(')?'const { t } = useI18n();':!output.includes('t(')?'const { displayText } = useI18n();':'const { t, displayText } = useI18n();');
 writeFileSync(file,output);
}
