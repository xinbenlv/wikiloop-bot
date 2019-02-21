const MWBot = require('mwbot');
require('dotenv').config();
const DRY_RUN = false;

let notifyTitle = {
    en: 'Inconsistent Birthdays',
    fr: 'Anniversaires incohérents',
    de: 'Inkonsistente Geburtstage',
    zh: '生日不一致',
    jp: '矛盾した誕生日'

};
let notifyText = {
    en: `Dear editors interested in this subject,we found that this subject's the birthdays on different Wikipedia languages are inconsistent. Could you help check?`,
    fr: `Chers rédacteurs qui s'intéressent à ce sujet, nous avons constaté que les anniversaires de ce sujet dans différentes langues de Wikipedia sont incohérents. Pourriez-vous nous aider à vérifier？?`,
    de: `Liebe Redakteure, die an diesem Thema interessiert sind, wir haben festgestellt, dass die Geburtstage dieses Themas in verschiedenen Wikipedia-Sprachen inkonsistent sind. Könntest du helfen zu überprüfen?`,
    zh: `亲爱的本主题有关的编辑们，我们发现这个主题在不同语言的维基百科页面上的生日不一致。 你能帮忙检查一下吗？`,
    jp: `この主題に興味を持っている編集者の皆さん、この主題の異なるウィキペディアの言語での誕生日は矛盾していることがわかりました。 チェックしてもらえますか？`
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

const languages = ['ja'];
function getTalkPageTitle(lang, subject) {
    if (lang === 'en') return `User:Xinbenlv_bot/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    else if (lang === 'fr') {
        return `Utilisateur:Xinbenlv_bot/sandbox/Project_Wikiloop/unique_value/Discussion:${subject}`;
    } else if (lang === 'zh') {
        return `User:Xinbenlv_bot/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    } else if (lang === 'de') {
        return `Benutzer:Xinbenlv_bot/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    } else if (lang === 'ja') {
        return `利用者:Xinbenlv_bot/sandbox/Project_Wikiloop/unique_value/Talk:${subject}`;
    } throw `lang=${lang} is not supported`;
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
    const csvFilePath=`data/en_ja.csv`;
    const csv=require('csvtojson');
    let jsonArray=await csv().fromFile(csvFilePath);
    // console.log(`XXX jsonArray`, jsonArray.slice(0,20));
    jsonArray = jsonArray.slice(0,8); // TODO(zzn): remove this
    let dict = {};
    jsonArray.forEach(entry => {
        if (!dict[entry.qid]) {
            dict[entry.qid] = {}
        }
        dict[entry.qid][entry.lang] = {
            subject: decodeURI(entry.title),
            birthday: entry.birthday,
            qid: entry.qid
        };
    });
    let conflicts = dict;
    console.log(`conflicts`, conflicts);

    for (let lang of languages) {
        let bot = await initBot(lang);
        for (let qid in conflicts) {
            let conflict = conflicts[qid];
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
                let contentForEdit = oldContent + `
= ${notifyTitle[lang]} (Xinbenlv_bot) =
${notifyText[lang]}` + tableHtml;
                let summaryForEdit = 'WikiLoopBot notify the page talk about birthday inconsistency #bot, #wikiloop';
                if (DRY_RUN) {
                    console.log(`Dry run ...`);
                    console.log(`Edit title`, pageTitle);
                    console.log(`Edit content`, summaryForEdit);
                    console.log(`Edit summaryForEdit`, summaryForEdit);

                    console.log(`Done fake editing, should have been on ${getFullUrl(lang, conflict[lang]['subject'])}`);
                } else {
                    res = await bot.edit(pageTitle,
                        contentForEdit,
                        summaryForEdit
                    );
                    console.log(`Res =`, JSON.stringify(res, null, '  '));
                    console.log(`Done real editing, see it ${getFullUrl(lang, conflict[lang]['subject'])}`);
                }

            }

        }

    }



}
// In the root scope of a script, you must use the promise notation, as await is not allowed there.
main().catch(console.error);