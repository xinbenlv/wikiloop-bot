const MWBot = require('mwbot');
require('dotenv').config();
const REAL_RUN = false;
const REAL_NAMESAPCE = false;

let notifyTitle = {
    en: 'Inconsistent Birthdays',
    fr: 'Anniversaires incohérents',
    de: 'Inkonsistente Geburtstage',
    zh: '生日不一致',
    ja: '矛盾した誕生日'

};
let notifyText = {
    en: `Dear editors interested in this subject,we found that this subject's the birthdays on different Wikipedia languages are inconsistent. Could you help check?`,
    fr: `Chers rédacteurs qui s'intéressent à ce sujet, nous avons constaté que les anniversaires de ce sujet dans différentes langues de Wikipedia sont incohérents. Pourriez-vous nous aider à vérifier？?`,
    de: `Liebe Redakteure, die an diesem Thema interessiert sind, wir haben festgestellt, dass die Geburtstage dieses Themas in verschiedenen Wikipedia-Sprachen inkonsistent sind. Könntest du helfen zu überprüfen?`,
    zh: `亲爱的本主题有关的编辑们，我们发现这个主题在不同语言的维基百科页面上的生日不一致。 你能帮忙检查一下吗？`,
    ja: `この主題に興味を持っている編集者の皆さん、この主題の異なるウィキペディアの言語での誕生日は矛盾していることがわかりました。 チェックしてもらえますか？`
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

const languages = ['zh'];

function getTalkPageTitle(lang, subject) {
    let sandboxPath = (user) => {
        return {
            en: `User:${user}/sandbox/Project_Wikiloop/unique_value`,
            fr: `Utilisateur:${user}/sandbox/Project_Wikiloop/unique_value`,
            zh: `User:${user}/sandbox/Project_Wikiloop/unique_value`,
            de: `Benutzer:${user}/sandbox/Project_Wikiloop/unique_value`,
            ja: `利用者:${user}/sandbox/Project_Wikiloop/unique_value`
        }[lang];
    };

    let talkToken = {
        en: `Talk`,
        fr: `Discussion`,
        zh: `Talk`,
        de: `Diskussion`,
        ja: `ノート`
    };

    if (REAL_NAMESAPCE) {
        return `${talkToken[lang]}:${subject}`;
    } else {
        return `${sandboxPath(process.env.WP_USER)}/${talkToken[lang]}:${subject}`
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
    const csvFilePath = `data/en_zh.csv`;
    const csv = require('csvtojson');
    let jsonArray = await csv().fromFile(csvFilePath);
    // console.log(`XXX jsonArray`, jsonArray.slice(0,20));
    jsonArray = jsonArray.slice(0, 4); // TODO(zzn): remove this
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
                    if (/{{(no)?bots(\||}})/i.test(oldContent)) {
                        console.log(`Found bots related restrictions, for simplicity, we skip it completely. qid=${qid}, pageTitle=${pageTitle}, lang=${lang}`);
                        continue;
                    } else if (/Xinbenlv_bot/i.test(oldContent)) {
                        console.log(`We have touched this page, we skip it completely. qid=${qid}, pageTitle=${pageTitle}, lang=${lang}`);
                        continue;
                    } else {
                        console.log(`XXX old content ok`, oldContent);
                    }
                }
                let titleMsg = `== ${notifyTitle[lang]} ==\n`;
                let msgboxTemplateCall = `\n{{User:xinbenlv_bot/msg/inconsistent_birthday\n`;
                for (let _lang in conflict) {
                    if (conflict[_lang]) {
                        msgboxTemplateCall += `| ${_lang}
| [[:${_lang}:${conflict[_lang]['subject']}]]
| [[${conflict[_lang]['birthday']}]]
`;
                    }
                }
                msgboxTemplateCall += `|DATE=${new Date().toISOString()}}}\n`;
                let contentForEdit = oldContent + titleMsg + msgboxTemplateCall ;
                console.log(msgboxTemplateCall);
                let summaryForEdit = 'WikiLoopBot notify the page talk about birthday inconsistency #bot, #wikiloop';
                if (REAL_RUN) {
                    res = await bot.edit(pageTitle,
                        contentForEdit,
                        summaryForEdit
                    );
                    console.log(`Res =`, JSON.stringify(res, null, '  '));
                    console.log(`Done real editing, see it ${getFullUrl(lang, conflict[lang]['subject'])}`);
                } else {
                    console.log(`Dry run ...`);
                    console.log(`Edit title`, pageTitle);
                    console.log(`Edit content\n\n`, contentForEdit, `\n\n`);
                    console.log(`Edit summaryForEdit`, summaryForEdit);
                    console.log(`Done fake editing, should have been on ${getFullUrl(lang, conflict[lang]['subject'])}`);
                }

            }

        }

    }


}

// In the root scope of a script, you must use the promise notation, as await is not allowed there.
main().catch(console.error);