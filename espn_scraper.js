const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

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

        //console.log('Game Data:', gameInfo);
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
        const competitors = jsonData.header.competitions[0].competitors
        competitors.forEach(com => {
            if(com.homeAway === "home"){
                homescore = com.score;
            }else if(com.homeAway === "away"){
                awayscore = com.score;
            }
        });

        console.log("\n=======🏀 比赛信息 🏀=======");
        console.log("主队:", homeTeam.team.displayName, `(${homescore}),客队:`, awayTeam.team.displayName);
        console.log("比分:", homescore, "VS ", awayscore);

        const playersData = [];
        // 解析球队统计数据
        const teamsData = jsonData.boxscore.teams.map(team => {
            const stats = {};
            stats["team"] = team.team.displayName; // 球队名称
            team.statistics.forEach(stat => {
                stats[stat.label] = stat.displayValue || "N/A";
            });
            return stats;
        });

        console.log("\n=======📊 球队统计 📊=======");
        console.table(teamsData);

        // 解析球员数据
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

        console.log("\n=======🏀 球员统计 🏀=======");
        console.table(playersData);

        // 解析比赛摘要（Recap）
        const recap = jsonData.article.story || "暂无摘要";
        console.log("\n=======📜 比赛摘要 📜=======");
        console.log(recap);

        // 解析比赛过程（Play-by-Play）
        console.log("\n=======🎭 比赛过程（完整）🎭=======");
        if (jsonData.plays && jsonData.plays.length > 0) {
            jsonData.plays.forEach(play => {
                console.log(`[${play.period.displayValue} - ${play.clock.displayValue}] ${play.text}`);
            });
        } else {
            console.log("暂无比赛过程数据");
        }

        // 解析详细球队统计（Team Stats）
        if (jsonData.boxscore.teams[0].statistics && jsonData.boxscore.teams[1].statistics) {
            console.log("\n=======📊 详细球队数据 📊=======");
            jsonData.boxscore.teams.forEach(team => {
                console.log(`\n🏀 ${team.team.displayName}`);
                team.statistics.forEach(stat => {
                    console.log(`${stat.name}: ${stat.displayValue}`);
                });
            });
        } else {
            console.log("\n暂无详细球队统计数据");
        }

    } catch (error) {
        console.error('获取比赛数据时出错:', error.message);
    }
}

getLakersGameData();
