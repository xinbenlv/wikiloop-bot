const MWBot = require('mwbot');
require('dotenv').config();
const REAL_RUN = true;
const REAL_NAMESAPCE = true;
const Bottleneck = require("bottleneck");
const limiter = new Bottleneck({
    minTime: 2000
});

let notifyTitle = {
    en: 'Inconsistent Birthdays',
    fr: 'Anniversaires incohérents',
    de: 'Inkonsistente Geburtstage',
    zh: '生日不一致',
    ja: '矛盾した誕生日',
    ru: `Несовместимые Дни рождения`,
    es: `Cumpleaños inconsistentes`,
    it: `Compleanni incoerenti`,

};

const languages = ['fr'];

function getTalkPageTitle(lang, subject) {
    let sandboxPath = (user) => {
        return {
            en: `User:${user}/sandbox/Project_Wikiloop/unique_value`,
            fr: `Utilisateur:${user}/sandbox/Project_Wikiloop/unique_value`,
            zh: `User:${user}/sandbox/Project_Wikiloop/unique_value`,
            de: `Benutzer:${user}/sandbox/Project_Wikiloop/unique_value`,
            ja: `利用者:${user}/sandbox/Project_Wikiloop/unique_value`,
            ru: `Категория:${user}/sandbox/Project_Wikiloop/unique_value`,
            es: `Usuario:${user}/sandbox/Project_Wikiloop/unique_value`,
            it: `Utente:${user}/sandbox/Project_Wikiloop/unique_value`,
        }[lang];
    };

    let talkToken = {
        en: `Talk`,
        fr: `Discussion`,
        zh: `Talk`,
        de: `Diskussion`,
        ja: `ノート`,
        ru: `Обсуждение`,
        es: `Discusión`,
        it: `Discussione`,
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
    const mwbot = new MWBot({
        apiUrl: `https://${lang}.wikipedia.org/w/api.php`
    });
    await mwbot.loginGetEditToken({
        username: process.env.WP_USER,
        password: process.env.WP_PASSWORD
    });
    return mwbot;
}

async function main() {
    const csvFilePath = `data/en_fr.csv`;
    const csv = require('csvtojson');
    let jsonArray = await csv().fromFile(csvFilePath);
    jsonArray = jsonArray.slice(0, 2000);
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
        let mwbot = await initBot(lang);
        for (let qid in conflicts) {
            let conflict = conflicts[qid];
            if (conflict[lang]) {
                let pageTitle, res;
                pageTitle = getTalkPageTitle(lang, conflict[lang]['subject']);
                let oldContent;
                res = await mwbot.read(pageTitle);
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
                        console.log(`Old Content`, oldContent);
                    }
                }
                let titleMsg = `\n\n== ${notifyTitle[lang]} ==\n`;
                let msgboxTemplateCall = `\n{{User:xinbenlv_bot/msg/inconsistent_birthday\n`;
                for (let _lang in conflict) {
                    if (conflict[_lang]) {
                        msgboxTemplateCall += `| ${_lang}
| [[:${_lang}:${conflict[_lang]['subject']}]]
| [[${conflict[_lang]['birthday']}]]
`;
                    }
                } 
				msgboxTemplateCall += `|status=\n|by=\n`;
				msgboxTemplateCall += `|DATE=${new Date().toISOString()}}}\n\n`;
                let contentForEdit = oldContent + titleMsg + msgboxTemplateCall ;
                console.log(msgboxTemplateCall);
                let summaryForEdit = 'WikiLoopBot notify the page talk about birthday inconsistency #bot, #wikiloop';
                if (REAL_RUN) {
                    res = await limiter.schedule(async () => await mwbot.edit(pageTitle,
                        contentForEdit,
                        summaryForEdit
                    ));
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
