import * as fs from 'fs';

const path = 'app/onboarding/select-profile/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    'if (step === 6 && distributionRule === "custom" && Math.abs(distributionTotal - 100) > 0.01)',
    'if (step === 8 && selected === "personal" && distributionRule === "custom" && Math.abs(distributionTotal - 100) > 0.01)'
);

// We need to exactly locate the start and end of step 6 personal, 6 business, 7, and 8.
const s6pStart = content.indexOf('{step === 6 && selected === "personal" && (');
const s6bStart = content.indexOf('{step === 6 && selected === "business" && (');
const s7Start = content.indexOf('{step === 7 && (');
const s8Start = content.indexOf('{step === 8 && (');
const s8End = content.indexOf('<div className="mt-10 flex items-center justify-between border-t border-surface-200 pt-6">');

const s6p = content.substring(s6pStart, s6bStart);
const s6b = content.substring(s6bStart, s7Start);
const s7 = content.substring(s7Start, s8Start);
const s8 = content.substring(s8Start, s8End);

// Inside s8, we have the projection block:
const projStart = s8.indexOf('{hasSavingsGoals && projectedGoalRows.length > 0 && (');
const projEnd = s8.length; // Basically the rest of s8 minus the closing `                        )}` and `                            </div>`

// Let's split s8 at projStart:
const s8Form = s8.substring(0, projStart);
const s8Proj = s8.substring(projStart);

// We need to remove the trailing `                            </div>\n                        )}\n` from s8Form so we can use it as Step 6.
const s8FormTrimmed = s8Form.replace(/(\n\s*<\/div>\n\s*\)\}\n\s*)$/, '');

// Actually, it's easier to just build the new sections.
let newStep6 = s8FormTrimmed.replace('{step === 8 && (', '{step === 6 && (') + '\n                            </div>\n                        )}\n\n                        ';
let newStep7 = s7;
let newStep8p = s6p.replace('{step === 6 && selected === "personal" && (', '{step === 8 && selected === "personal" && (');
let newStep8b = s6b.replace('{step === 6 && selected === "business" && (', '{step === 8 && selected === "business" && (');

// Insert the projection part at the end of newStep8p
// newStep8p ends with `                            </div>\n                        )}\n\n                        `
newStep8p = newStep8p.replace(
    /(\n\s*<\/div>\n\s*\)\}\n\s*)$/, 
    '\n\n                                ' + s8Proj.trim() + '$1'
);

// We also want to update the text in step8p
newStep8p = newStep8p.replace(
    '<h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Regla de distribución</h1>',
    '<h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Regla de distribución y Resumen</h1>'
);
newStep8p = newStep8p.replace(
    '<p className="mt-3 text-base text-surface-600 leading-relaxed">\n                                        Elige cómo dividir tu bolsa mensual consolidada entre necesidades, ahorro y deuda.\n                                    </p>',
    '<p className="mt-3 text-base text-surface-600 leading-relaxed">\n                                        Elige cómo dividir tu bolsa mensual. Te mostraremos cómo se financiarán tus metas con esta regla.\n                                    </p>'
);

const newContent = content.substring(0, s6pStart) + newStep6 + newStep7 + newStep8p + newStep8b + content.substring(s8End);

fs.writeFileSync(path, newContent, 'utf8');
console.log("Success");
