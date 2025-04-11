const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const fs = require('fs');

const ESPN_URL = 'https://www.espn.com/nba/team/schedule/_/name/lal';

/**
 * 获取 NBA 球队当前赛季的比赛日程
 * @param {string|number} team - 球队名称（支持模糊搜索，如 "Lakers"）或 ESPN 球队 ID（如 13）
 * @returns {Promise<Object>} - 返回球队比赛日程
 */
async function getNBATeamSchedule(team) {
    try {
        let teamId = team;

        // 如果输入的是队名，进行模糊匹配获取球队 ID
        if (isNaN(team)) {
            const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`;
            const teamsResponse = await axios.get(teamsUrl);
            const teams = teamsResponse.data.sports[0].leagues[0].teams;

            // 进行模糊匹配
            const foundTeam = teams.find(t => 
                t.team.displayName.toLowerCase().includes(team.toLowerCase()) ||
                t.team.shortDisplayName.toLowerCase().includes(team.toLowerCase()) ||
                t.team.abbreviation.toLowerCase() === team.toLowerCase()
            );

            if (!foundTeam) {
                throw new Error(`未找到匹配的球队: ${team}`);
            }

            teamId = foundTeam.team.id;
            //console.log(`匹配到球队: ${foundTeam.team.displayName} (ID: ${teamId})`);
        }

        // 获取球队的比赛日程
        const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`;
        const scheduleResponse = await axios.get(scheduleUrl);
        return scheduleResponse.data;
        
    } catch (error) {
        console.error("获取球队比赛日程时出错:", error.message);
        return null;
    }
}

/**
 * 获取最近一场已经完成的比赛的 gameId
 * @param {Object} schedule - 球队的比赛日程数据（从 ESPN API 获取）
 * @param {string} [date] - 查询的起始日期，格式为 "YYYY-MM-DD"（默认为今天）
 * @returns {Promise<number|null>} - 返回最近完成的 gameId，如果找不到则返回 null
 */
async function getLatestCompletedGameId(schedule, date = new Date().toISOString().split('T')[0]) {
    try {
        // 解析比赛日程
        if (!schedule || !schedule.events || schedule.events.length === 0) {
            throw new Error("比赛日程数据无效或为空");
        }

        // 获取所有比赛信息
        const games = schedule.events.map(event => {
            // 取得比赛日期并格式化为 YYYY-MM-DD
            const gameDate = event.date.split('T')[0];
            const isCompleted = event.competitions && event.competitions.some(competition => competition.type.text === "Standard" && competition.boxscoreAvailable);

            return {
                gameId: event.id,
                date: gameDate,
                status: isCompleted ? "completed" : "upcoming"
            };
        });

        // 按日期降序排序（最新的比赛在前）
        games.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 从指定日期往前查找已完成的比赛
        let latestGame = null;
        for (let game of games) {
            if (new Date(game.date) <= new Date(date) && game.status === "completed") {
                latestGame = game;
                break;
            }
        }

        // 返回 gameId 或 null
        return latestGame ? latestGame.gameId : null;
    } catch (error) {
        console.error("查找最近已完成比赛时出错:", error.message);
        return null;
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
        console.log(`|球队|得分|投篮|投篮命中率%|三分球|三分命中率%|罚球` + 
                    `|罚球命中率%|篮板|进攻篮板|防守篮板|助攻|抢断|盖帽|总失误数` +
                    `|个人失误|团队失误|失误得分|快攻得分|内线内分|犯规|技术犯规` +
                    `|恶意犯规|最大领先|`);
        console.log(`|---|---|---|---|---|---|---` +
                    `|---|---|---|---|---|---|---` +
                    `|---|---|---|---|---|---|---` +
                    `|---|---|---|`);
        jsonData.boxscore.teams.forEach(team => {
            const teamId = team.team.id;
            const stats = {
                team: team.team.displayName,
                score: scoreMap[teamId] || "N/A", // 关联 score
                FG: team.statistics.find(stat => stat.name === "fieldGoalsMade-fieldGoalsAttempted")?.displayValue || "N/A",
                fieldGoalPct: team.statistics.find(stat => stat.name === "fieldGoalPct")?.displayValue || "N/A",
                threePointFieldGoalsMadeAttempted: team.statistics.find(stat => stat.name=== "threePointFieldGoalsMade-threePointFieldGoalsAttempted")?.displayValue || "N/A",
                threePointFieldGoalPct: team.statistics.find(stat => stat.name=== "threePointFieldGoalPct")?.displayValue || "N/A",
                freeThrowsMadeAttempted: team.statistics.find(stat => stat.name=== "freeThrowsMade-freeThrowsAttempted")?.displayValue || "N/A",
                freeThrowPct: team.statistics.find(stat => stat.name=== "freeThrowPct")?.displayValue || "N/A",
                totalRebounds: team.statistics.find(stat => stat.name=== "totalRebounds")?.displayValue || "N/A",
                offensiveRebounds: team.statistics.find(stat => stat.name=== "offensiveRebounds")?.displayValue || "N/A",
                defensiveRebounds: team.statistics.find(stat => stat.name=== "defensiveRebounds")?.displayValue || "N/A",
                assists: team.statistics.find(stat => stat.name=== "assists")?.displayValue || "N/A",
                steals: team.statistics.find(stat => stat.name=== "steals")?.displayValue || "N/A",
                blocks: team.statistics.find(stat => stat.name=== "blocks")?.displayValue || "N/A",
                totalTurnovers :team.statistics.find(stat => stat.name=== "totalTurnovers")?.displayValue || "N/A",
                turnovers: team.statistics.find(stat => stat.name=== "turnovers")?.displayValue || "N/A",
                teamTurnovers: team.statistics.find(stat => stat.name=== "teamTurnovers")?.displayValue || "N/A",
                turnoverPoints:team.statistics.find(stat => stat.name=== "turnoverPoints")?.displayValue || "N/A",
                fastBreakPoints :team.statistics.find(stat => stat.name=== "fastBreakPoints")?.displayValue || "N/A",
                pointsInPaint :team.statistics.find(stat => stat.name=== "pointsInPaint")?.displayValue || "N/A",
                fouls: team.statistics.find(stat => stat.name=== "fouls")?.displayValue || "N/A",
                technicalFouls: team.statistics.find(stat => stat.name=== "technicalFouls")?.displayValue || "N/A",
                flagrantFouls :team.statistics.find(stat => stat.name=== "flagrantFouls")?.displayValue || "N/A",
                largestLead :team.statistics.find(stat => stat.name=== "largestLead")?.displayValue || "N/A",
            };
            console.log(`| ${stats.team} | ${stats.score} | ${stats.FG}` + 
            `| ${stats.fieldGoalPct} | ${stats.threePointFieldGoalsMadeAttempted}` +
            `| ${stats.threePointFieldGoalPct} ` +
            `| ${stats.freeThrowsMadeAttempted} | ${stats.freeThrowPct}` +
            `| ${stats.totalRebounds} |${stats.offensiveRebounds}` +
            `| ${stats.defensiveRebounds} | ${stats.assists} | ${stats.steals}` +
            `| ${stats.blocks} | ${stats.totalTurnovers} | ${stats.turnovers}` +
            `| ${stats.teamTurnovers} | ${stats.turnoverPoints} | ${stats.fastBreakPoints}` +
            `| ${stats.pointsInPaint} | ${stats.fouls} | ${stats.technicalFouls}` +
            `| ${stats.flagrantFouls} | ${stats.largestLead}|`);
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

        // 5. 解析比赛过程（Play-by-Play）
         console.log(`\n### 🎭 比赛过程（完整）`);
        if (jsonData.plays && jsonData.plays.length > 0) {
            jsonData.plays.forEach(play => {
                console.log(`- **[${play.period.displayValue} - ${play.clock.displayValue}]** ${play.text}`);
            });
        } else {
            console.log("暂无比赛过程数据");
        }

        // 6. 解析比赛摘要（Recap）
        const recap = jsonData.article.story || "暂无摘要";
        console.log(`\n### 📜 比赛摘要`);
        console.log(recap);
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

async function main() {
    let teamArg = process.argv[2]; // 获取命令行参数（队名或ID）
    
    if (!teamArg) {
        teamArg = "Lakers";
    }

    const schedule = await getNBATeamSchedule(teamArg);

    if (schedule) {
        const gameId = await getLatestCompletedGameId(schedule);
        if (gameId) {
            await getDetailedBoxScore(gameId);
        } else {
            console.log("未找到最近已完成的比赛");
        }
    }
}

main();
