# NBAStatsCrawler

爬取espn中NBA比赛数据,包括主队，客队，比分情况，球队数据统计，球员数据统计，比赛概览，以及比赛过程。

## 示例

### 🏀 比赛信息
**比赛 ID:** 401705297
**主队:** Los Angeles Lakers  **得分:** 120
**客队:** Golden State Warriors  **得分:** 112
### 📊 球队统计
| 球队 | 得分 | 命中-出手数 | 投篮命中率 | 三分命中率 | 罚球命中率 | 篮板 | 助攻 | 失误 |
|------|------|------------|-------------|-----------|------------|------|------|------|
| Golden State Warriors | 112 | 41-101 | 40.6 | 30.2 | 70.0 | 40 | 29 | 12 |
| Los Angeles Lakers | 120 | 39-78 | 50.0 | 37.1 | 80.6 | 47 | 26 | 13 |

### 🏀 球员统计 🏀
| team | name | short_name | position | jersey | MIN | FG | 3PT | FT | OREB | DREB | REB | AST | STL | BLK | TO | PF | +/- | PTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Golden State Warriors | Draymond Green | D. Green | Power Forward | 23 | 33 | 5-7 | 2-2 | 1-3 | 0 | 5 | 5 | 4 | 2 | 1 | 0 | 5 | -1 | 13 |
| Golden State Warriors | Quinten Post | Q. Post | Center | 21 | 11 | 2-5 | 2-5 | 0-0 | 0 | 2 | 2 | 2 | 0 | 0 | 0 | 2 | -17 | 6 |
| Golden State Warriors | Stephen Curry | S. Curry | Point Guard | 30 | 37 | 13-35 | 6-20 | 5-5 | 2 | 5 | 7 | 4 | 1 | 1 | 4 | 3 | -3 | 37 |
| Golden State Warriors | …… | …… | …… | …… | …… | …… | …… |…… | …… | …… | …… | …… | …… | …… | …… | …… | …… | …… |
| Los Angeles Lakers | Dorian Finney-Smith | D. Finney-Smith | Power Forward | 17 | 33 | 3-6 | 1-4 | 0-0 | 0 | 1 | 1 | 3 | 2 | 0 | 2 | 2 | +8 | 7 |
| Los Angeles Lakers | Rui Hachimura | R. Hachimura | Power Forward | 28 | 39 | 4-9 | 1-5 | 2-4 | 0 | 4 | 4 | 3 | 0 | 0 | 0 | 3 | +12 | 11 |
| Los Angeles Lakers | LeBron James | L. James | Small Forward | 23 | 38 | 14-25 | 6-9 | 8-10 | 1 | 16 | 17 | 8 | 1 | 1 | 3 | 1 | +7 | 42 |
| Los Angeles Lakers | …… | …… | …… | …… | …… | …… | …… |…… | …… | …… | …… | …… | …… | …… | …… | …… | …… | …… |


### 📜 比赛摘要
LOS ANGELES -- — <a href="http://www.espn.com/nba/player/_/id/1966/lebron-james">LeBron James</a> had 42 points, 17 rebounds and eight assists, and the <a href="http://www.espn.com/nba/team/_/name/lal/los-angeles-lakers">Los Angeles Lakers</a> blew most of a 26-point lead before hanging on to beat the <a href="http://www.espn.com/nba/team/_/name/gs/golden-state-warriors">Golden State Warriors</a> 120-112 on Thursday night.

……

### 🎭 比赛过程（完整）
- **[1st Quarter - 12:00]** Quinten Post vs. Jaxson Hayes (LeBron James gains possession)
- **[1st Quarter - 11:41]** LeBron James bad pass (Stephen Curry steals)
- **[1st Quarter - 11:37]** Jaxson Hayes blocks Stephen Curry 's 4-foot two point shot
- **[1st Quarter - 11:37]** Warriors offensive team rebound
- **[1st Quarter - 11:27]** Buddy Hield bad pass (Austin Reaves steals)
- **[1st Quarter - 11:25]** Austin Reaves makes two point shot
- **[1st Quarter - 11:25]** Quinten Post shooting foul
- **[1st Quarter - 11:25]** Austin Reaves makes free throw 1 of 1
- **[1st Quarter - 11:09]** Quinten Post makes 25-foot three point jumper (Brandin Podziemski assists)
- **[1st Quarter - 10:50]** LeBron James makes 26-foot three point jumper (Jaxson Hayes assists)
- **[1st Quarter - 10:38]** Stephen Curry misses 25-foot three point jumper
- **[1st Quarter - 10:35]** Rui Hachimura defensive rebound
- **[1st Quarter - 10:30]** Austin Reaves misses 18-foot step back jumpshot
- **[1st Quarter - 10:27]** Buddy Hield defensive rebound
- **[1st Quarter - 10:18]** Stephen Curry bad pass (Dorian Finney-Smith steals)
- **[1st Quarter - 10:07]** Quinten Post personal foul

- ……

## 使用方式

```
node espn_scraper.js [team or teamId]    
```
参数可以为队名，支持模糊搜索，也可以是球队id,比如以下都指向湖人：
```
node yourscript.js "Lakers" 

//或者
node yourscript.js "Los Angeles Lakers"    

//或者
node yourscript.js 13 //13为湖人队teamId     
```



