const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const fs = require('fs');

const ESPN_URL = 'https://www.espn.com/nba/team/schedule/_/name/lal';

async function getLakersGameData() {
    try {
        const response = await axios.get(ESPN_URL);
        const $ = cheerio.load(response.data);
        const beijingTime = moment().tz('Asia/Shanghai');
        const espnTime = beijingTime.clone().tz('America/New_York');
        const today = espnTime.format('ddd, MMM D');

        let gameInfo = null;
        let lastCompletedGame = null;
        let gameLink = null;

        $('tbody tr').each((index, element) => {
            let dateText = $(element).find('td:first-child').text().trim().replace(/\s+/g, ' ');
            if (!dateText) return;

            const gameDate = moment(dateText, 'ddd, MMM D', true);
            if (!gameDate.isValid() || gameDate.isAfter(espnTime, 'day')) return;

            const resultText = $(element).find('td:nth-child(3)').text().trim();
            if (!resultText || /\d{1,2}:\d{2} (AM|PM)/.test(resultText) || resultText.toLowerCase().includes('tickets')) return;

            const opponent = $(element).find('td:nth-child(2)').text().trim();
            const result = resultText;
            const teamRecord = $(element).find('td:nth-child(4)').text().trim();
            const topPerformer = $(element).find('td:nth-child(5)').text().trim();

            $(element).find('td a').each((i, link) => {
                const href = $(link).attr('href');
                if (href && href.includes('/game/_/gameId/')) {
                    gameLink = href.startsWith('http') ? href : `https://www.espn.com${href}`;
                }
            });

            const gameData = { date: dateText, opponent, result, teamRecord, topPerformer, gameLink };

            if (dateText.includes(today)) {
                gameInfo = gameData;
                return false;
            }
            lastCompletedGame = gameData;
        });

        if (!gameInfo && lastCompletedGame) gameInfo = lastCompletedGame;
        if (!gameInfo || !gameInfo.date) return;

        const gameid = gameInfo.gameLink.split('/')[7];
        if (gameInfo.gameLink) await getDetailedBoxScore(gameid);
    } catch (error) {
        console.error('Error fetching Lakers game data:', error);
    }
}



async function  getDetailedBoxScore(gameId) {
    const ESPN_API_URL = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    try {
        // 1. 发送请求获取比赛数据
        const response = await axios.get(ESPN_API_URL);
        const jsonData = response.data;

        if (!jsonData.boxscore || !jsonData.boxscore.players) {
            console.error('未找到 Box Score 数据');
            return;
        }

        // 2.获取比赛基本信息
        let homeTeam = null;
        let awayTeam = null;
        const teams = jsonData.boxscore.teams
        teams.forEach(team=> {
            if (team.homeAway === "home") {
                homeTeam = team;
            } else if (team.homeAway === "away") {
                awayTeam = team;
            }
        });

        let homescore = null;
        let awayscore = null;
        let scoreMap = {}; // 存储 teamId -> score 映射关系
        const competitors = jsonData.header.competitions[0].competitors
        competitors.forEach(team=> {
            const teamId = team.team.id;
            scoreMap[teamId] = team.score; // 存储 teamId -> score
            if (team.homeAway === "home") {
                homescore = team.score;
            } else {
                awayscore = team.score;
            }
        });

        console.log(`### 🏀 比赛信息`);
        console.log(`**比赛 ID:** ${gameId}`);
        console.log(`**主队:** ${homeTeam.team.displayName}  **得分:** ${homescore}`);
        console.log(`**客队:** ${awayTeam.team.displayName}  **得分:** ${awayscore}`);

        // 3.获取球队统计数据
        console.log(`### 📊 球队统计`);
        console.log(`| 球队 | 得分 | 命中-出手数 | 投篮命中率 | 三分命中率 | 罚球命中率 | 篮板 | 助攻 | 失误 |`);
        console.log(`|------|------|------------|-------------|-----------|------------|------|------|------|`);
        jsonData.boxscore.teams.forEach(team => {
            const teamId = team.team.id;
            const stats = {
                team: team.team.displayName,
                score: scoreMap[teamId] || "N/A", // 关联 score
                fieldGoalMadeAttempted: team.statistics.find(stat => stat.name === "fieldGoalsMade-fieldGoalsAttempted")?.displayValue || "N/A",
                fieldGoalPct: team.statistics.find(stat => stat.name === "fieldGoalPct")?.displayValue || "N/A",
                threePointPct: team.statistics.find(stat => stat.name === "threePointFieldGoalPct")?.displayValue || "N/A",
                freeThrowPct: team.statistics.find(stat => stat.name === "freeThrowPct")?.displayValue || "N/A",
                rebounds: team.statistics.find(stat => stat.name === "totalRebounds")?.displayValue || "N/A",
                assists: team.statistics.find(stat => stat.name === "assists")?.displayValue || "N/A",
                turnovers: team.statistics.find(stat => stat.name === "turnovers")?.displayValue || "N/A",
            };
            console.log(`| ${stats.team} | ${stats.score} | ${stats.fieldGoalMadeAttempted} | ${stats.fieldGoalPct} | ${stats.threePointPct} | ${stats.freeThrowPct} | ${stats.rebounds} | ${stats.assists} | ${stats.turnovers} |`);
        });


        // 4. 解析球员数据
        const playersData = [];
        jsonData.boxscore.players.forEach(team => {
            const teamName = team.team.displayName;
            team.statistics.forEach(statGroup => {
                const keys = statGroup.keys;
                statGroup.athletes.forEach(player => {
                    const playerData = {
                        team: teamName,
                        name: player.athlete.displayName,
                        short_name: player.athlete.shortName,
                        position: player.athlete.position.displayName,
                        jersey: player.athlete.jersey,
                    };
                    // 解析统计数据
                    player.stats.forEach((statValue, index) => {
                        const statName = keys[index];
                        playerData[statName] = statValue;
                    });
                    playersData.push(playerData);
                });
            });
        });

        console.log("\n### 🏀 球员统计 🏀");
        console.log(toMarkdownTable(playersData));

        // 5. 解析比赛摘要（Recap）
        const recap = jsonData.article.story || "暂无摘要";
        console.log(`\n### 📜 比赛摘要`);
        console.log(recap);

        // 6. 解析比赛过程（Play-by-Play）
         console.log(`\n### 🎭 比赛过程（完整）`);
        if (jsonData.plays && jsonData.plays.length > 0) {
            jsonData.plays.forEach(play => {
                console.log(`- **[${play.period.displayValue} - ${play.clock.displayValue}]** ${play.text}`);
            });
        } else {
            console.log("暂无比赛过程数据");
        }
    } catch (error) {
        console.error('获取比赛数据时出错:', error.message);
    }
}

function toMarkdownTable(data) {
    if (!data.length) return '';

    // 获取表头（Object keys）
    const headers = Object.keys(data[0]);

    // 生成 Markdown 表头
    let markdown = `| ${headers.join(' | ')} |\n`;
    markdown += `|${headers.map(() => '---').join('|')}|\n`;

    // 生成 Markdown 表格内容
    data.forEach(row => {
        markdown += `| ${headers.map(key => row[key] || 'N/A').join(' | ')} |\n`;
    });

    return markdown;
}

getLakersGameData();
