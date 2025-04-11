import re
import argparse
import requests
import time
import random
from bs4 import BeautifulSoup

# 设置请求头
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Referer": "https://movie.douban.com/",
    "Connection": "keep-alive",
    # 可加入 X-Requested-With, Origin 等高级字段
}

def get_info(info_type:str, douban_id:str, output:str):
    start = 0
    if not output:
        output = f"{info_type}-{douban_id}.md"
    md_lines = [
        f"| {info_type}名称 | 观看日期 | 评分 | 标签 | 评论 |",
        "|----------|----------|------|------|------|"
    ]
    while True:
        url = f'https://{info_type}.douban.com/people/{douban_id}/collect?start={start}&sort=time&rating=all&filter=all&mode=list'
        res = requests.get(url, headers=headers)
        soup = BeautifulSoup(res.text, 'html.parser')
        items = soup.find_all("li", class_="item")
        if not items:
            break
        for item in items:
            # 1. 电影名称
            title_tag = item.find("div", class_="title").find("a")
            title = title_tag.get_text(strip=True)
        
            # 2. 观看日期
                # 2. 日期与评分
            date_div = item.find("div", class_="date")
            if date_div:
                # 提取评分 class 中的数字
                span = date_div.find("span")
                rating = "无评分"
                if span:
                    classes = span.get("class", [])
                    match = next((re.search(r"rating(\d)-t", cls) for cls in classes if "rating" in cls), None)
                    if match and match.group(1):
                        rating = match.group(1)
        
                # 提取日期文本（去除 span 后的文本内容）
                date_text = date_div.get_text(separator=" ", strip=True)
                date = re.sub(r"rating\d-t", "", date_text).strip(" \u00a0")  # 清理非断空格
            else:
                rating = "无评分"
                date = "无日期"
    
            # 4. 评论 comment
            comment_div = item.find("div", class_="comment")
            comment = comment_div.get_text(strip=True) if comment_div else "无"
        
            # 5. 标签 tags
            tags_span = item.find("span", class_="tags")
            tags = tags_span.get_text(strip=True).replace("标签: ", "") if tags_span else "无"
        
            # 转义竖线符号，防止 Markdown 表格错位
            def escape_md(text):
                return text.replace("|", "\\|").replace("\n", " ").strip()
    
            print(f"{escape_md(title)},{escape_md(date)},{escape_md(rating)}, {escape_md(comment)}\n")
            # 加入表格行
            md_lines.append(
                f"| {escape_md(title)} | {escape_md(date)} | {escape_md(rating)} | {escape_md(tags)} | {escape_md(comment)} |"
            )
        time.sleep(random.randint(3,10))
        # 更新 start 值以获取下一页内容
        start += 30
    # 写入 Markdown 文件
    with open(output, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"✅ 数据已保存为 {output}")

 
def get_movies(douban_id:str, output:str = ""):
    get_info("movie", douban_id, output)

def get_books(douban_id:str, output:str = ""):
    get_info("book", douban_id, output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='parameters')
    parser.add_argument('id', type=str, help='douban id')
    parser.add_argument('--output', type=str, help='output markdown')
    args = parser.parse_args()

    get_books(args.id, args.output)
    get_movies(args.id, args.output)
