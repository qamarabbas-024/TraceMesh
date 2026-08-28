"""Social media OSINT - Reddit, Google Custom Search"""
import httpx
from config import settings


class SocialOSINT:
    """Social media intelligence"""

    @staticmethod
    async def reddit_user(username: str) -> dict:
        """Reddit user info + recent activity (no key needed)"""
        headers = {"User-Agent": "TraceMesh-OSINT/1.0"}
        async with httpx.AsyncClient(timeout=15) as client:
            profile_resp = await client.get(
                f"https://www.reddit.com/user/{username}/about.json",
                headers=headers
            )
            if profile_resp.status_code != 200:
                return {"username": username, "exists": False, "error": f"HTTP {profile_resp.status_code}"}

            data = profile_resp.json().get("data", {})

            posts_resp = await client.get(
                f"https://www.reddit.com/user/{username}/submitted.json?limit=15",
                headers=headers
            )
            posts = []
            if posts_resp.status_code == 200:
                for child in posts_resp.json().get("data", {}).get("children", []):
                    p = child.get("data", {})
                    posts.append({
                        "title": p.get("title"),
                        "subreddit": p.get("subreddit"),
                        "score": p.get("score"),
                        "url": p.get("url"),
                        "created": p.get("created_utc"),
                        "comments": p.get("num_comments"),
                    })

            comments_resp = await client.get(
                f"https://www.reddit.com/user/{username}/comments.json?limit=15",
                headers=headers
            )
            comments = []
            if comments_resp.status_code == 200:
                for child in comments_resp.json().get("data", {}).get("children", []):
                    c = child.get("data", {})
                    comments.append({
                        "body": c.get("body", "")[:200],
                        "subreddit": c.get("subreddit"),
                        "score": c.get("score"),
                        "created": c.get("created_utc"),
                        "link": c.get("link_url"),
                    })

            return {
                "username": username,
                "exists": True,
                "profile": {
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "created_utc": data.get("created_utc"),
                    "link_karma": data.get("link_karma", 0),
                    "comment_karma": data.get("comment_karma", 0),
                    "is_gold": data.get("is_gold", False),
                    "is_mod": data.get("is_mod", False),
                    "description": (data.get("subreddit") or {}).get("public_description", ""),
                    "avatar": data.get("icon_img", ""),
                },
                "recent_posts": posts,
                "recent_comments": comments,
            }

    @staticmethod
    async def google_custom_search(query: str) -> dict:
        """Google Custom Search - deep OSINT via Google"""
        if not settings.google_cse_key or not settings.google_cse_cx:
            return {"error": "No Google CSE credentials"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "key": settings.google_cse_key,
                    "cx": settings.google_cse_cx,
                    "q": query,
                    "num": 10,
                }
            )
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                return {
                    "query": query,
                    "total_results": resp.json().get("searchInformation", {}).get("totalResults", "0"),
                    "results": [{
                        "title": i.get("title"),
                        "link": i.get("link"),
                        "snippet": i.get("snippet"),
                        "source": i.get("displayLink"),
                    } for i in items]
                }
            return {"error": f"Google CSE HTTP {resp.status_code}"}
