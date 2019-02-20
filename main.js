const MWBot = require('mwbot');
require('dotenv').config();

let notifyText = {
    en: `Dear editors who cares about this subject,we found that this subject's the birthdays on different Wikipedia languages are inconsistent. Could you help check?`,
    fr: `Chers rédacteurs qui s'intéressent à ce sujet, nous avons constaté que les anniversaires de ce sujet dans différentes langues de Wikipedia sont incohérents. Pourriez-vous aider à vérifier?`
};

let conflicts = [
    {
        en: {
            subject: 'Henry_Mayes',
            birthday: '1880-02-14',
        },
        fr: {
            subject: 'Henry_Mayes',
            birthday: '1880-02-17'
        }
    }
];
const languages = ['fr', 'en'];
function getTalkPageTitle(lang, subject) {
    if (lang === 'en') return `User:Xinbenlv/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    else if (lang === 'fr') {
        return `Utilisateur:Xinbenlv/sandbox/Project_Wikiloop/unique_value/Discussion:${subject}`;
    } else if (lang === 'zh') {
        return `User:Xinbenlv/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    }
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
                res = await bot.read(pageTitle);
                let oldContent;
                if (res['query']['pages'][-1]) {
                    oldContent = ''
                } else {
                    console.log(`Read`, JSON.stringify(res, null, '  '));
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
                        tableHtml += `<tr>
                          <td>${_lang}</td>
                          <td>[[:${_lang}:${conflict[_lang]['subject']}]]</td>
                          <td>${conflict[_lang]['birthday']}</td>
                        </tr>`;
                    }

                }
                tableHtml+='</table>';
                res = await bot.edit(pageTitle,
                    oldContent + `
= WikiLoopBot =
${notifyText[lang]}` + tableHtml,
                    'WikiLoopBot notify the page talk about birthday inconsistency'
                );
                console.log(`result`, JSON.stringify(res, null, '  '));
            }

        }

    }



}
// In the root scope of a script, you must use the promise notation, as await is not allowed there.
main().catch(console.error);