#!/usr/bin/env python3
"""Seed realistic People and publication data through the public admin API.

This is deliberately API-only so the same path exercises uploads, role checks,
review queue behaviour, publication, and the public read model.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any, Optional

import requests


PEOPLE_GROUPS: dict[str, dict[str, Any]] = {
    "PhD Students": {
        "role": "PhD Student",
        "prefix": "phd",
        "interests": ["Robot learning", "World models", "Safe control"],
        "names": ["陈墨", "周航", "林嘉", "沈言", "许安", "方启", "叶宁", "顾远", "苏禾", "韩森", "陆遥", "唐昕", "白舟", "罗川", "江临"],
    },
    "Master's Students": {
        "role": "Master's Student",
        "prefix": "masters",
        "interests": ["Manipulation", "Vision-language action", "Imitation learning"],
        "names": ["赵晨", "李沐", "王澄", "徐昊", "孙妍", "郑宇", "陈曦", "林涛", "吴桐", "何安", "许诺", "陆川", "周妍", "沈宁", "方舟"],
    },
    "Undergraduate Students": {
        "role": "Undergraduate Student",
        "prefix": "undergraduate",
        "interests": ["Robot perception", "Data collection", "Embedded systems"],
        "names": ["林可", "周乐", "陈果", "李想", "许晴", "王一", "赵宁", "苏然", "徐可", "唐果", "叶青", "顾晨", "韩露", "白杨", "罗伊"],
    },
    "Research staff": {
        "role": "Research Engineer",
        "prefix": "research-staff",
        "interests": ["Robotics systems", "Hardware integration", "Reliable deployment"],
        "names": ["高远", "沈博", "赵恒", "林越", "周同", "陈默", "王拓", "李昂", "许宁", "方越", "吴笛", "郑朗", "唐哲", "沈一", "赵骁"],
    },
    "Alumni": {
        "role": "Lab Alumnus",
        "prefix": "alumni",
        "interests": ["Robot learning", "Autonomous systems", "Research translation"],
        "names": ["孟远", "顾承", "周立", "林一", "叶帆", "赵言", "陈野", "王川", "李珩", "苏昊", "沈乔", "方宁", "吴越", "许森", "郑谦"],
    },
}


PAPERS: list[dict[str, Any]] = [
    {
        "arxiv": "2307.15818",
        "title": "RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control",
        "authors": "Anthony Brohan, Noah Brown, Justice Carbajal, Yevgen Chebotar, Joseph Dabis, Chelsea Finn, et al.",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://robotics-transformer.github.io/",
        "code": None,
        "video": "https://robotics-transformer.github.io/",
    },
    {
        "arxiv": "2310.08864",
        "title": "Open X-Embodiment: Robotic Learning Datasets and RT-X Models",
        "authors": "Open X-Embodiment Collaboration, Abby O'Neill, Abdul Rehman, Abhinav Gupta, Abhiram Maddukuri, et al.",
        "venue": "International Conference on Robotics and Automation",
        "short": "ICRA",
        "year": 2024,
        "type": "Conference",
        "homepage": "https://robotics-transformer-x.github.io/",
        "code": "https://github.com/google-deepmind/open_x_embodiment",
        "video": "https://robotics-transformer-x.github.io/",
    },
    {
        "arxiv": "2405.12213",
        "title": "Octo: An Open-Source Generalist Robot Policy",
        "authors": "Octo Model Team, Dibya Ghosh, Homer Walke, Karl Pertsch, Kevin Black, Oier Mees, et al.",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2024,
        "type": "Conference",
        "homepage": "https://octo-models.github.io/",
        "code": "https://github.com/octo-models/octo",
        "video": "https://octo-models.github.io/",
    },
    {
        "arxiv": "2406.09246",
        "title": "OpenVLA: An Open-Source Vision-Language-Action Model",
        "authors": "Moo Jin Kim, Karl Pertsch, Siddharth Karamcheti, Ted Xiao, Ashwin Balakrishna, Suraj Nair, et al.",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2024,
        "type": "Conference",
        "homepage": "https://openvla.github.io/",
        "code": "https://github.com/openvla/openvla",
        "video": "https://openvla.github.io/",
    },
    {
        "arxiv": "2303.04137",
        "title": "Diffusion Policy: Visuomotor Policy Learning via Action Diffusion",
        "authors": "Cheng Chi, Zhenjia Xu, Siyuan Feng, Eric Cousineau, Yilun Du, Benjamin Burchfiel, et al.",
        "venue": "Robotics: Science and Systems",
        "short": "RSS",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://diffusion-policy.cs.columbia.edu/",
        "code": "https://github.com/real-stanford/diffusion_policy",
        "video": "https://diffusion-policy.cs.columbia.edu/",
    },
    {
        "arxiv": "2304.13705",
        "title": "Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware",
        "authors": "Tony Z. Zhao, Vikash Kumar, Sergey Levine, Chelsea Finn",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://tonyzhaozh.github.io/aloha/",
        "code": "https://github.com/tonyzhaozh/aloha",
        "video": "https://tonyzhaozh.github.io/aloha/",
    },
    {
        "arxiv": "2401.02117",
        "title": "Mobile ALOHA: Learning Bimanual Mobile Manipulation with Low-Cost Whole-Body Teleoperation",
        "authors": "Zipeng Fu, Tony Z. Zhao, Chelsea Finn",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2024,
        "type": "Conference",
        "homepage": "https://mobile-aloha.github.io/",
        "code": "https://github.com/MarkFzp/mobile-aloha",
        "video": "https://mobile-aloha.github.io/",
    },
    {
        "arxiv": "2410.24164",
        "title": "π0: A Vision-Language-Action Flow Model for General Robot Control",
        "authors": "Kevin Black, Noah Brown, Danny Driess, Adnan Esmail, Michael Equi, Chelsea Finn, et al.",
        "venue": "Robotics: Science and Systems",
        "short": "RSS",
        "year": 2025,
        "type": "Conference",
        "homepage": "https://www.physicalintelligence.company/blog/pi0",
        "code": "https://github.com/Physical-Intelligence/openpi",
        "video": "https://www.physicalintelligence.company/blog/pi0",
    },
    {
        "arxiv": "2212.06817",
        "title": "RT-1: Robotics Transformer for Real-World Control at Scale",
        "authors": "Anthony Brohan, Noah Brown, Justice Carbajal, Yevgen Chebotar, Joseph Dabis, Chelsea Finn, et al.",
        "venue": "International Conference on Robotics and Automation",
        "short": "ICRA",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://robotics-transformer1.github.io/",
        "code": "https://github.com/google-research/robotics_transformer",
        "video": "https://robotics-transformer1.github.io/",
    },
    {
        "arxiv": "2303.03378",
        "title": "PaLM-E: An Embodied Multimodal Language Model",
        "authors": "Danny Driess, Fei Xia, Mehdi S. M. Sajjadi, Corey Lynch, Aakanksha Chowdhery, Brian Ichter, et al.",
        "venue": "International Conference on Learning Representations",
        "short": "ICLR",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://palm-e.github.io/",
        "code": None,
        "video": "https://palm-e.github.io/",
    },
    {
        "arxiv": "2209.05451",
        "title": "Perceiver-Actor: A Multi-Task Transformer for Robotic Manipulation",
        "authors": "Mohit Shridhar, Lucas Manuelli, Dieter Fox",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2022,
        "type": "Conference",
        "homepage": "https://peract.github.io/",
        "code": "https://github.com/peract/peract",
        "video": "https://peract.github.io/",
    },
    {
        "arxiv": "2210.03094",
        "title": "VIMA: General Robot Manipulation with Multimodal Prompts",
        "authors": "Yunfan Jiang, Agrim Gupta, Zichen Zhang, Guanzhi Wang, Yongqiang Dou, Yanjun Chen, et al.",
        "venue": "International Conference on Machine Learning",
        "short": "ICML",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://vimalabs.github.io/",
        "code": "https://github.com/vimalabs/vima",
        "video": "https://vimalabs.github.io/",
    },
    {
        "arxiv": "2209.07753",
        "title": "Code as Policies: Language Model Programs for Embodied Control",
        "authors": "Jacky Liang, Wenlong Huang, Fei Xia, Peng Xu, Karol Hausman, Brian Ichter, et al.",
        "venue": "arXiv",
        "short": "arXiv",
        "year": 2022,
        "type": "Preprint",
        "homepage": "https://code-as-policies.github.io/",
        "code": "https://github.com/google-research/google-research/tree/master/code_as_policies",
        "video": "https://code-as-policies.github.io/",
    },
    {
        "arxiv": "2108.03298",
        "title": "What Matters in Learning from Offline Human Demonstrations for Robot Manipulation",
        "authors": "Ajay Mandlekar, Danfei Xu, Josiah Wong, Soroush Nasiriany, Chen Wang, Rohun Kulkarni, et al.",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2021,
        "type": "Conference",
        "homepage": "https://robomimic.github.io/",
        "code": "https://github.com/ARISE-Initiative/robomimic",
        "video": "https://robomimic.github.io/",
    },
    {
        "arxiv": "2306.11706",
        "title": "RoboCat: A Self-Improving Generalist Agent for Robotic Manipulation",
        "authors": "Konstantinos Bousmalis, Giulia Vezzani, Dushyant Rao, Coline Devin, Alex X. Lee, Maria Bauza, et al.",
        "venue": "Transactions on Machine Learning Research",
        "short": "TMLR",
        "year": 2023,
        "type": "Journal",
        "homepage": "https://deepmind.google/discover/blog/robocat-a-self-improving-foundation-model-for-robotic-manipulation/",
        "code": None,
        "video": "https://deepmind.google/discover/blog/robocat-a-self-improving-foundation-model-for-robotic-manipulation/",
    },
    {
        "arxiv": "2310.17596",
        "title": "MimicGen: A Data Generation System for Scalable Robot Learning using Human Demonstrations",
        "authors": "Ajay Mandlekar, Soroush Nasiriany, Bowen Wen, Iretiayo Akinola, Yashraj Narang, Linxi Fan, et al.",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://mimicgen.github.io/",
        "code": "https://github.com/NVlabs/mimicgen",
        "video": "https://mimicgen.github.io/",
    },
    {
        "arxiv": "2308.12952",
        "title": "BridgeData V2: A Dataset for Robot Learning at Scale",
        "authors": "Homer Walke, Kevin Black, Abraham Lee, Moo Jin Kim, Max Du, Chongyi Zheng, et al.",
        "venue": "Conference on Robot Learning",
        "short": "CoRL",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://rail-berkeley.github.io/bridgedata/",
        "code": None,
        "video": "https://rail-berkeley.github.io/bridgedata/",
    },
    {
        "arxiv": "2305.05658",
        "title": "TidyBot: Personalized Robot Assistance with Large Language Models",
        "authors": "Jimmy Wu, Rika Antonova, Adam Kan, Marion Lepert, Andy Zeng, Shuran Song, et al.",
        "venue": "IEEE/RSJ International Conference on Intelligent Robots and Systems",
        "short": "IROS",
        "year": 2023,
        "type": "Conference",
        "homepage": "https://tidybot.cs.princeton.edu/",
        "code": None,
        "video": "https://tidybot.cs.princeton.edu/",
    },
    {
        "arxiv": "2310.12931",
        "title": "Eureka: Human-Level Reward Design via Coding Large Language Models",
        "authors": "Yecheng Jason Ma, William Liang, Guanzhi Wang, De-An Huang, Osbert Bastani, Dinesh Jayaraman, et al.",
        "venue": "International Conference on Learning Representations",
        "short": "ICLR",
        "year": 2024,
        "type": "Conference",
        "homepage": "https://eureka-research.github.io/",
        "code": "https://github.com/eureka-research/Eureka",
        "video": "https://eureka-research.github.io/",
    },
    {
        "arxiv": "2309.01918",
        "title": "RoboAgent: Generalization and Efficiency in Robot Manipulation via Semantic Augmentations and Action Chunking",
        "authors": "Homanga Bharadhwaj, Jay Vakil, Mohit Sharma, Abhinav Gupta, Shubham Tulsiani, Vikash Kumar",
        "venue": "arXiv",
        "short": "arXiv",
        "year": 2023,
        "type": "Preprint",
        "homepage": "https://arxiv.org/abs/2309.01918",
        "code": None,
        "video": None,
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=os.getenv("LAB_BASE_URL", "http://127.0.0.1:8080"))
    parser.add_argument("--admin-email", default=os.getenv("LAB_ADMIN_EMAIL", "admin@motionlab.local"))
    parser.add_argument("--admin-password", default=os.getenv("LAB_ADMIN_PASSWORD", "change-me-now"))
    parser.add_argument("--avatar-dir", required=True)
    parser.add_argument("--paper-dir", required=True)
    return parser.parse_args()


class Api:
    def __init__(self, base_url: str) -> None:
        self.base = base_url.rstrip("/")
        self.session = requests.Session()

    def login(self, email: str, password: str) -> tuple[str, dict[str, Any]]:
        response = self.session.post(f"{self.base}/api/auth/login", json={"email": email, "password": password}, timeout=30)
        response.raise_for_status()
        body = response.json()
        return body["token"], body["user"]

    def register(self, email: str, name: str, password: str) -> tuple[str, dict[str, Any]]:
        response = self.session.post(f"{self.base}/api/auth/register", json={"email": email, "full_name": name, "password": password}, timeout=30)
        if response.status_code == 409:
            return self.login(email, password)
        response.raise_for_status()
        body = response.json()
        return body["token"], body["user"]

    def json(self, method: str, path: str, token: str, **kwargs: Any) -> Any:
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        response = self.session.request(method, f"{self.base}{path}", headers=headers, timeout=60, **kwargs)
        if not response.ok:
            raise RuntimeError(f"{method} {path} failed ({response.status_code}): {response.text[:300]}")
        return response.json() if response.content else None

    def upload(self, token: str, path: Path) -> str:
        with path.open("rb") as handle:
            response = self.session.post(
                f"{self.base}/api/admin/upload",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": (path.name, handle, "application/pdf" if path.suffix == ".pdf" else "image/jpeg" if path.suffix == ".jpg" else "image/png")},
                timeout=180,
            )
        if not response.ok:
            raise RuntimeError(f"upload {path.name} failed ({response.status_code}): {response.text[:300]}")
        return response.json()["url"]


def ensure_editor(api: Api, admin_token: str) -> tuple[str, dict[str, Any]]:
    email = "qa.reviewer@motionlab.local"
    password = "QaReviewer2026!"
    try:
        result = api.json("POST", "/api/admin/users", admin_token, json={"email": email, "full_name": "论文审核测试员", "password": password, "role": "editor"})
        print(f"created editor account: {result['email']}")
    except RuntimeError as error:
        if "409" not in str(error):
            raise
    return api.login(email, password)


def seed_people(api: Api, admin_token: str, avatar_dir: Path) -> int:
    existing = api.json("GET", "/api/admin/people", admin_token)
    existing_keys = {(row["name"], row["group"]) for row in existing}
    created = 0
    for group, spec in PEOPLE_GROUPS.items():
        for index, name in enumerate(spec["names"], start=1):
            if (name, group) in existing_keys:
                continue
            avatar = avatar_dir / f"{spec['prefix']}-{index:02d}.jpg"
            avatar_url = api.upload(admin_token, avatar)
            api.json(
                "POST",
                "/api/admin/people",
                admin_token,
                json={
                    "name": name,
                    "role": spec["role"],
                    "group": group,
                    "bio": f"专注于{spec['interests'][0]}与真实机器人系统的研究。",
                    "research_interests": spec["interests"],
                    "email": f"{spec['prefix']}-{index:02d}@motionlab.local",
                    "website_url": None,
                    "avatar_url": avatar_url,
                    "is_visible": True,
                },
            )
            created += 1
    print(f"people added: {created} (Faculty untouched)")
    return created


def publication_payload(paper: dict[str, Any], pdf_url: Optional[str], thumb_url: Optional[str], *, published: bool) -> dict[str, Any]:
    return {
        "title": paper["title"],
        "authors": paper["authors"],
        "venue": paper["venue"],
        "venue_short": paper["short"],
        "year": paper["year"],
        "type": paper["type"],
        "status": "Published" if published else "Pending review",
        "abstract": "公开论文演示条目，用于验证论文首页、PDF、代码、视频和缩略图字段。",
        "paper_url": f"https://arxiv.org/abs/{paper['arxiv']}",
        "pdf_url": pdf_url,
        "code_url": paper["code"],
        "video_url": paper["video"],
        "thumbnail_url": thumb_url,
        "featured": False,
        "is_published": published,
    }


def seed_publications(api: Api, admin_token: str, editor_token: str, contributor_token: str, paper_dir: Path) -> tuple[int, int]:
    existing = api.json("GET", "/api/admin/publications", admin_token)
    existing_by_url = {row.get("paper_url"): row for row in existing}
    added = 0
    submitted_for_review = 0
    for index, paper in enumerate(PAPERS):
        paper_url = f"https://arxiv.org/abs/{paper['arxiv']}"
        if paper_url in existing_by_url:
            continue
        pdf_path = paper_dir / f"{paper['arxiv']}.pdf"
        thumb_path = paper_dir / f"{paper['arxiv']}-thumb.png"
        pdf_url = api.upload(admin_token, pdf_path)
        thumb_url = api.upload(admin_token, thumb_path)
        if index == 0:
            created = api.json("POST", "/api/admin/publications", contributor_token, json=publication_payload(paper, pdf_url, thumb_url, published=True))
            submitted_for_review += 1
            review_items = api.json("GET", "/api/admin/review-queue", editor_token)
            review = next(item for item in review_items if item["id"] == created["id"] and item["content_type"] == "publication")
            api.json("PUT", f"/api/admin/publications/{review['id']}", editor_token, json=publication_payload(paper, pdf_url, thumb_url, published=False))
            api.json("POST", f"/api/admin/review-queue/publication/{review['id']}/publish", editor_token)
            print("publication review flow: contributor -> editor edit -> published")
        else:
            api.json("POST", "/api/admin/publications", admin_token, json=publication_payload(paper, pdf_url, thumb_url, published=True))
        added += 1
    print(f"publications added: {added}; submitted for review: {submitted_for_review}")
    return added, submitted_for_review


def verify(api: Api, admin_token: str) -> None:
    home_response = api.session.get(f"{api.base}/api/public/home", timeout=30)
    home_response.raise_for_status()
    home = home_response.json()
    counts = {group: 0 for group in PEOPLE_GROUPS}
    for person in home["people"]:
        if person["group"] in counts:
            counts[person["group"]] += 1
    assert all(counts[group] >= 15 for group in counts), counts
    paper_urls = {f"https://arxiv.org/abs/{paper['arxiv']}" for paper in PAPERS}
    public_papers = [row for row in home["publications"] if row.get("paper_url") in paper_urls]
    assert len(public_papers) == 20, f"expected 20 public papers, got {len(public_papers)}"
    assert all(row.get("thumbnail_url") and row.get("pdf_url") for row in public_papers)
    for row in public_papers:
        for key in ("thumbnail_url", "pdf_url"):
            response = api.session.get(f"{api.base}{row[key]}", timeout=30)
            assert response.status_code == 200, (row["title"], key, response.status_code)
    queue = api.json("GET", "/api/admin/review-queue", admin_token)
    assert not any(item["title"] == PAPERS[0]["title"] for item in queue)
    print(f"verified public groups: {counts}")
    print("verified 20 publications with reachable PDF and thumbnail files")
    print("verified reviewed publication is absent from the review queue")


def main() -> None:
    args = parse_args()
    avatar_dir = Path(args.avatar_dir)
    paper_dir = Path(args.paper_dir)
    api = Api(args.base_url)
    admin_token, admin_user = api.login(args.admin_email, args.admin_password)
    assert admin_user["role"] == "admin", admin_user
    contributor_token, contributor_user = api.register("qa.submitter@motionlab.local", "论文投稿测试员", "QaSubmitter2026!")
    assert contributor_user["role"] == "contributor", contributor_user
    editor_token, editor_user = ensure_editor(api, admin_token)
    assert editor_user["role"] == "editor", editor_user
    people_added = seed_people(api, admin_token, avatar_dir)
    publications_added, reviewed = seed_publications(api, admin_token, editor_token, contributor_token, paper_dir)
    verify(api, admin_token)
    print(f"DONE people={people_added} publications={publications_added} reviewed={reviewed}")


if __name__ == "__main__":
    main()
