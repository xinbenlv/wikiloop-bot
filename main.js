const MWBot = require('mwbot');
require('dotenv').config();

let notifyTitle = {
    en: 'Inconsistent Birthdays',
    fr: 'Anniversaires incohérents',
    de: 'Inkonsistente Geburtstage',
    zh: '生日不一致'
};
let notifyText = {
    en: `Dear editors interested in this subject,we found that this subject's the birthdays on different Wikipedia languages are inconsistent. Could you help check?`,
    fr: `Chers rédacteurs qui s'intéressent à ce sujet, nous avons constaté que les anniversaires de ce sujet dans différentes langues de Wikipedia sont incohérents. Pourriez-vous aider à vérifier?`,
    de: `Liebe Redakteure, die an diesem Thema interessiert sind, wir haben festgestellt, dass die Geburtstage dieses Themas in verschiedenen Wikipedia-Sprachen inkonsistent sind. Könntest du helfen zu überprüfen?`,
    zh: `亲爱的编辑们对这个主题感兴趣，我们发现这个主题是不同维基百科语言的生日不一致。 你能帮忙检查一下吗？`
};


let conflicts = [
    {
        en: {
            subject: 'Samuel_Gathimba',
            birthday: '1977-03-05',
        },
        fr: {
            subject: 'Samuel_Gathimba',
            birthday: '1987-10-26'
        },
    }
];
const languages = ['fr', 'en', 'zh', 'de'];
function getTalkPageTitle(lang, subject) {
    if (lang === 'en') return `User:Xinbenlv/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    else if (lang === 'fr') {
        return `Utilisateur:Xinbenlv/sandbox/Project_Wikiloop/unique_value/Discussion:${subject}`;
    } else if (lang === 'zh') {
        return `User:Xinbenlv/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    }
}

function getFullUrl(lang, subject) {
    return `https://${lang}.wikipedia.org/wiki/${getTalkPageTitle(lang, subject)}`;
}
async function initBot(lang) {
    const bot = new MWBot({
        apiUrl: `https://${lang}.wikipedia.org/w/api.php`
    });
    await bot.loginGetEditToken({
        username: process.env.WP_USER,
        password: process.env.WP_PASSWORD
    });
    return bot;
}
async function main() {

    for (let lang of languages) {
        let bot = await initBot(lang);
        for (let conflict of conflicts) {
            if (conflict[lang]) {
                let pageTitle, res;
                pageTitle = getTalkPageTitle(lang, conflict[lang]['subject']);
                let oldContent;
                res = await bot.read(pageTitle);
                console.log(res);
                if (res['query']['pages'][-1]) {
                    oldContent = ''
                } else {
                    console.log(`Read the page`);
                    let pageId = Object.keys(res.query['pages'])[0];
                    oldContent = res.query['pages'][pageId]['revisions'][0]['*'];
                }
                let tableHtml = `
<table class="wikitable">
  <caption>Conflicting Birthdays</caption>
  <tr>
    <th>Language</th>
    <th>Subject</th>
    <th>Birthday</th>
   </tr>`;
                for (let _lang of languages) {
                    if (conflict[_lang]) {
                        tableHtml += `
  <tr>
    <td>${_lang}</td>
    <td>[[:${_lang}:${conflict[_lang]['subject']}]]</td>
    <td>${conflict[_lang]['birthday']}</td>
  </tr>`;
                    }

                }
                tableHtml+='</table>';
                res = await bot.edit(pageTitle,
                    oldContent + `
= ${notifyTitle[lang]} =
${notifyText[lang]}` + tableHtml,
                    'WikiLoopBot notify the page talk about birthday inconsistency #bot, #wikiloop'
                );
                console.log(`Done editing, see it ${getFullUrl(lang, conflict[lang]['subject'])}`);
            }

        }

    }



}
// In the root scope of a script, you must use the promise notation, as await is not allowed there.
main().catch(console.error);