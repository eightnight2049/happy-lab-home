import uuid
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, inspect, or_, select, text, update
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, require_roles, verify_password
from .db import SessionLocal, engine, get_db, settings
from .models import Base, Feedback, LabSettings, NewsItem, Person, Publication, ResearchArea, Submission, User
from .schemas import (AccountRolePayload, AdminPersonOut, AdminPublicationOut, CreateUserRequest, FeedbackOut, FeedbackPayload, FeedbackStatusPayload, HomeOut, LoginRequest,
                      LoginResponse, NewsOut, NewsPayload, PersonOut, PersonPayload, PublicationOut, PublicationPayload,
                      RegisterRequest, RegisterResponse, ResearchOut, ReviewActionOut, ReviewQueueItem, SettingsOut, SettingsPayload, SubmissionOut,
                      UpdateUserRequest, UserOut, VisitOut)

app = FastAPI(title="Motion Intelligence Lab API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
MAX_ADMIN_COUNT = 5
origins = [value.strip() for value in settings.cors_origins.split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins or ["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
Path(settings.media_root).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_root), name="media")


def seed(db: Session) -> None:
    if not db.scalar(select(User).limit(1)):
        db.add(User(email=settings.admin_email, full_name="Lab administrator", password_hash=hash_password(settings.admin_password), role="admin"))
    if not db.scalar(select(LabSettings).limit(1)):
        db.add(LabSettings(name="Motion Intelligence Lab", short_name="MI Lab", tagline="We build intelligent machines that learn to move safely in the real world.", description="Our lab studies the intersection of robot learning, embodied intelligence, and dependable autonomy. We build systems that can reason about motion, adapt to new environments, and collaborate with people.", location="School of Engineering · Shanghai", email="hello@motionlab.example", hero_kicker="Robotics · Learning · Trust", hero_image_url="/reference/lab-dinner.jpg", google_scholar_url="https://scholar.google.com/", github_url="https://github.com/"))
    if not db.scalar(select(ResearchArea).limit(1)):
        db.add_all([ResearchArea(kicker="01 · Learn", title="World models for action", description="Predictive representations that connect perception, language, and action so robots can plan before they move.", accent="red", sort_order=1), ResearchArea(kicker="02 · Adapt", title="Generalizable manipulation", description="Learning skills that transfer across objects, embodiments, and the long tail of real-world environments.", accent="amber", sort_order=2), ResearchArea(kicker="03 · Trust", title="Safe autonomy", description="Uncertainty-aware policies and evaluation tools for robots that remain dependable around people.", accent="ink", sort_order=3)])
    if not db.scalar(select(Person).limit(1)):
        db.add_all([Person(name="Dr. Xiaodong Yue", role="Principal Investigator", group="Faculty", bio="Xiaodong leads the lab's work on learning-based control and trustworthy autonomy.", research_interests=["Robot learning", "Safe control", "World models"], email="lin.zhao@motionlab.example", website_url="https://example.com", avatar_url="/Xiaodong-transparent.png", sort_order=1), Person(name="Maya Chen", role="PhD Student", group="Students", bio="Maya studies active data collection for dexterous manipulation.", research_interests=["Manipulation", "Active learning"], email="maya.chen@motionlab.example", sort_order=2), Person(name="Ethan Wu", role="PhD Student", group="Students", bio="Ethan works on calibrated uncertainty for robot planning.", research_interests=["Planning", "Uncertainty"], email="ethan.wu@motionlab.example", sort_order=3), Person(name="Aria Patel", role="Research Engineer", group="Research staff", bio="Aria builds the hardware and software systems behind our experiments.", research_interests=["Systems", "Hardware"], email="aria.patel@motionlab.example", sort_order=4), Person(name="Noah Kim", role="Visiting Student", group="Students", bio="Noah explores multimodal policies for mobile manipulation.", research_interests=["Vision-language", "Mobile robots"], email="noah.kim@motionlab.example", sort_order=5)])
    alumni_rows = db.scalars(
        select(Person)
        .where(func.lower(Person.group) == "alumni")
        .order_by(Person.sort_order, Person.id)
    ).all()
    alumni_defaults = [
        ("PhD", 2014, "Assistant Professor · ShanghaiTech University"),
        ("PhD", 2016, "Research Scientist · NVIDIA Research"),
        ("PhD", 2018, "Principal Engineer · ABB Robotics"),
        ("Master's", 2019, "Machine Learning Engineer · ByteDance"),
        ("Master's", 2020, "Research Engineer · DJI"),
        ("Master's", 2021, "Product Data Scientist · Medtronic"),
        ("Undergraduate", 2021, "M.S. student · Carnegie Mellon University"),
        ("Undergraduate", 2022, "M.S. student · University of Toronto"),
        ("Undergraduate", 2023, "Software Engineer · Huawei"),
    ]
    if not alumni_rows:
        sample_alumni = [
            "Mina Zhou",
            "Evan Lin",
            "Jiawen Wu",
            "Yifan Xu",
            "Siyu Wang",
            "Leo Chen",
        ]
        for index, name in enumerate(sample_alumni):
            level, year, destination = alumni_defaults[index]
            db.add(
                Person(
                    name=name,
                    role="Lab Alumnus",
                    group="Alumni",
                    education_level=level,
                    enrollment_year=year,
                    destination=destination,
                    bio="Former member of the Motion Intelligence Lab.",
                    research_interests=[],
                    sort_order=100 + index,
                )
            )
        db.flush()
        alumni_rows = db.scalars(
            select(Person)
            .where(func.lower(Person.group) == "alumni")
            .order_by(Person.sort_order, Person.id)
        ).all()
    for index, row in enumerate(alumni_rows):
        default_level, default_year, default_destination = alumni_defaults[index % len(alumni_defaults)]
        if row.education_level is None:
            row.education_level = default_level
        if row.enrollment_year is None:
            row.enrollment_year = default_year
        if row.destination is None:
            row.destination = default_destination
    if not db.scalar(select(NewsItem).limit(1)):
        db.add_all([NewsItem(date=date(2026, 8, 18), title="New preprint available", body="Our new work on uncertainty-aware visuomotor policies is now available as a preprint.", href="/publications", tag="Publication", sort_order=1), NewsItem(date=date(2026, 7, 4), title="Best Paper Award at RoboLearn 2026", body="Congratulations to the team for receiving the Best Paper Award for Safe Policy Improvement with World Models.", tag="Award", sort_order=2), NewsItem(date=date(2026, 6, 12), title="We are welcoming new students", body="Applications are open for motivated students interested in robot learning and embodied intelligence.", href="/join", tag="Lab", sort_order=3), NewsItem(date=date(2026, 4, 22), title="The lab is growing", body="Three new members have joined our group to work on dexterous manipulation and safe navigation.", href="/people", tag="People", sort_order=4)])
    if not db.scalar(select(Publication).limit(1)):
        db.add(Publication(title="Safe Policy Improvement with Calibrated World Models", authors="M. Chen, E. Wu, L. Zhao", venue="Robotics: Science and Systems", venue_short="RSS", year=2026, type="Conference", status="Published", abstract="A practical framework for using predictive world models while explicitly accounting for model uncertainty.", paper_url="#", pdf_url="#", code_url="#", video_url="#", featured=True, is_published=True))
    db.commit()


def migrate_schema() -> None:
    settings_columns = {column["name"] for column in inspect(engine).get_columns("lab_settings")}
    publication_columns = {column["name"] for column in inspect(engine).get_columns("publications")}
    people_columns = {column["name"] for column in inspect(engine).get_columns("people")}
    news_columns = {column["name"] for column in inspect(engine).get_columns("news_items")}
    with engine.begin() as connection:
        if "founded_date" not in settings_columns:
            connection.execute(text("ALTER TABLE lab_settings ADD COLUMN founded_date DATE"))
        if "visit_count" not in settings_columns:
            connection.execute(text("ALTER TABLE lab_settings ADD COLUMN visit_count INTEGER NOT NULL DEFAULT 0"))
        if "started_at" not in settings_columns:
            connection.execute(text("ALTER TABLE lab_settings ADD COLUMN started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()"))
        if "venue_short" not in publication_columns:
            connection.execute(text("ALTER TABLE publications ADD COLUMN venue_short VARCHAR(80)"))
        if "created_by_id" not in publication_columns:
            connection.execute(text("ALTER TABLE publications ADD COLUMN created_by_id INTEGER"))
        if "created_by_id" not in people_columns:
            connection.execute(text("ALTER TABLE people ADD COLUMN created_by_id INTEGER"))
        if "education_level" not in people_columns:
            connection.execute(text("ALTER TABLE people ADD COLUMN education_level VARCHAR(60)"))
        if "enrollment_year" not in people_columns:
            connection.execute(text("ALTER TABLE people ADD COLUMN enrollment_year INTEGER"))
        if "destination" not in people_columns:
            connection.execute(text("ALTER TABLE people ADD COLUMN destination VARCHAR(240)"))
        if "created_by_id" not in news_columns:
            connection.execute(text("ALTER TABLE news_items ADD COLUMN created_by_id INTEGER"))
        # The portal now has exactly two account roles. Existing non-admin
        # accounts keep their access as ordinary users after the migration.
        connection.execute(text("UPDATE users SET role = 'contributor' WHERE role <> 'admin'"))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def save_submission(
    db: Session,
    user: User,
    content_type: str,
    action: str,
    content_id: int,
    payload: dict,
    title: str,
    summary: str,
) -> Submission:
    row = db.scalar(
        select(Submission)
        .where(
            Submission.submitted_by_id == user.id,
            Submission.content_type == content_type,
            Submission.content_id == content_id,
            Submission.status == "pending",
        )
        .order_by(Submission.id.desc())
    )
    if row is None:
        row = Submission(
            content_type=content_type,
            action=action,
            content_id=content_id,
            submitted_by_id=user.id,
            title=title,
            summary=summary,
            payload=payload,
            status="pending",
        )
        db.add(row)
    else:
        row.action = action
        row.title = title
        row.summary = summary
        row.payload = payload
        row.status = "pending"
        row.created_at = now_utc()
        row.reviewed_at = None
        row.reviewed_by_id = None
        row.cleared_at = None
    db.flush()
    return row


def sync_pending_submission(
    db: Session,
    content_type: str,
    content_id: int,
    payload: dict,
    title: str,
    summary: str,
) -> None:
    row = db.scalar(
        select(Submission)
        .where(
            Submission.content_type == content_type,
            Submission.content_id == content_id,
            Submission.status == "pending",
        )
        .order_by(Submission.id.desc())
    )
    if row:
        row.payload = payload
        row.title = title
        row.summary = summary
        row.created_at = now_utc()


def submission_out(row: Submission) -> SubmissionOut:
    return SubmissionOut.model_validate(row)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    with SessionLocal() as db:
        seed(db)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "motion-lab-api"}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if user and not user.is_active and verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account is waiting for administrator approval")
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")
    return LoginResponse(token=create_access_token(user), user=UserOut.model_validate(user))


@app.post("/api/auth/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="contributor",
        is_active=False,
    )
    db.add(user)
    db.flush()
    profile = Person(
        name=payload.full_name.strip(),
        role="Lab member",
        group="Students",
        email=email,
        bio="",
        research_interests=[],
        is_visible=False,
        created_by_id=user.id,
        sort_order=(db.scalar(select(func.max(Person.sort_order))) or 0) + 1,
    )
    db.add(profile)
    db.flush()
    save_submission(
        db,
        user,
        "person",
        "create",
        profile.id,
        {
            "name": payload.full_name.strip(),
            "role": "Lab member",
            "group": "Students",
            "education_level": None,
            "enrollment_year": None,
            "destination": None,
            "bio": "",
            "research_interests": [],
            "email": email,
            "website_url": None,
            "avatar_url": None,
            "is_visible": False,
        },
        profile.name,
        f"{profile.role} · {profile.group}",
    )
    db.commit()
    return RegisterResponse(status="pending", message="Registration submitted. An administrator must approve your account before you can sign in.")


@app.get("/api/public/home", response_model=HomeOut)
def public_home(db: Session = Depends(get_db)) -> HomeOut:
    settings_row = db.scalar(select(LabSettings).limit(1))
    if not settings_row:
        raise HTTPException(status_code=503, detail="Site has not been initialized")
    news = db.scalars(select(NewsItem).where(NewsItem.is_published.is_(True)).order_by(NewsItem.date.desc(), NewsItem.sort_order)).all()
    research = db.scalars(select(ResearchArea).where(ResearchArea.is_visible.is_(True)).order_by(ResearchArea.sort_order)).all()
    people = db.scalars(select(Person).where(Person.is_visible.is_(True)).order_by(Person.sort_order)).all()
    publications = db.scalars(select(Publication).where(Publication.is_published.is_(True)).order_by(Publication.year.desc(), Publication.created_at.desc())).all()
    return HomeOut(settings=SettingsOut.model_validate(settings_row), news=[NewsOut.model_validate(item) for item in news], research=[ResearchOut.model_validate(item) for item in research], people=[PersonOut.model_validate(item) for item in people], publications=[PublicationOut.model_validate(item) for item in publications])


@app.post("/api/public/visit", response_model=VisitOut)
def record_public_visit(db: Session = Depends(get_db)) -> VisitOut:
    settings_row = db.scalar(select(LabSettings).limit(1))
    if not settings_row:
        raise HTTPException(status_code=503, detail="Site has not been initialized")
    db.execute(update(LabSettings).where(LabSettings.id == settings_row.id).values(visit_count=LabSettings.visit_count + 1))
    db.commit()
    db.refresh(settings_row)
    return VisitOut(visit_count=settings_row.visit_count)


@app.put("/api/admin/settings", response_model=SettingsOut)
def update_settings(payload: SettingsPayload, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> SettingsOut:
    row = db.scalar(select(LabSettings).limit(1))
    if not row:
        row = LabSettings(id=1)
        db.add(row)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit(); db.refresh(row)
    return SettingsOut.model_validate(row)


@app.post("/api/admin/news", response_model=NewsOut)
def create_news(payload: NewsPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> NewsOut:
    values = payload.model_dump()
    values["date"] = values["date"] or date.today()
    values["created_by_id"] = user.id
    if user.role == "contributor":
        values["is_published"] = False
    row = NewsItem(**values); db.add(row); db.commit(); db.refresh(row)
    if user.role == "contributor":
        submission_values = payload.model_dump(mode="json")
        submission_values["date"] = values["date"].isoformat()
        save_submission(db, user, "news", "create", row.id, submission_values, row.title, row.body)
        db.commit()
    return NewsOut.model_validate(row)


@app.get("/api/admin/news", response_model=list[NewsOut])
def list_admin_news(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[NewsOut]:
    query = select(NewsItem)
    if user.role == "contributor":
        query = query.where(or_(NewsItem.is_published.is_(True), NewsItem.created_by_id == user.id))
    rows = db.scalars(query.order_by(NewsItem.date.desc(), NewsItem.sort_order, NewsItem.id.desc())).all()
    return [NewsOut.model_validate(row) for row in rows]


@app.put("/api/admin/news/{news_id}", response_model=NewsOut)
def update_news(news_id: int, payload: NewsPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> NewsOut:
    row = db.get(NewsItem, news_id)
    if not row:
        raise HTTPException(status_code=404, detail="News item not found")
    can_edit_own_content = user.role == "contributor" and row.created_by_id == user.id
    if user.role != "admin" and not can_edit_own_content:
        raise HTTPException(status_code=403, detail="You can only edit your own news submissions")
    values = payload.model_dump()
    if user.role == "contributor":
        submission_values = payload.model_dump(mode="json")
        submission_values["date"] = (values["date"] or row.date).isoformat()
        if row.is_published:
            save_submission(db, user, "news", "update", row.id, submission_values, payload.title, payload.body)
            db.commit()
            db.refresh(row)
            return NewsOut.model_validate(row)
        values["is_published"] = False
    for key, value in values.items():
        setattr(row, key, value)
    if user.role == "admin":
        sync_values = payload.model_dump(mode="json")
        sync_values["date"] = (values["date"] or row.date).isoformat()
        sync_pending_submission(db, "news", row.id, sync_values, row.title, row.body)
    else:
        submission_values = payload.model_dump(mode="json")
        submission_values["date"] = (values["date"] or row.date).isoformat()
        save_submission(db, user, "news", "create", row.id, submission_values, row.title, row.body)
    db.commit()
    db.refresh(row)
    return NewsOut.model_validate(row)


@app.delete("/api/admin/news/{news_id}")
def delete_news(news_id: int, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> dict[str, bool]:
    row = db.get(NewsItem, news_id)
    if not row: raise HTTPException(status_code=404, detail="News item not found")
    db.delete(row); db.commit()
    return {"deleted": True}


@app.post("/api/admin/publications", response_model=PublicationOut)
def create_publication(payload: PublicationPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PublicationOut:
    values = payload.model_dump()
    values["created_by_id"] = user.id
    if user.role == "contributor": values.update(status="Pending review", is_published=False, featured=False)
    elif values["is_published"]: values["status"] = "Published"
    elif values["status"] == "Published": values["status"] = "Pending review"
    row = Publication(**values); db.add(row); db.commit(); db.refresh(row)
    if user.role == "contributor":
        save_submission(
            db,
            user,
            "publication",
            "create",
            row.id,
            payload.model_dump(mode="json") | {"status": "Pending review", "is_published": False, "featured": False},
            row.title,
            f"{row.authors} · {row.venue} · {row.year}",
        )
        db.commit()
    return PublicationOut.model_validate(row)


@app.get("/api/admin/publications", response_model=list[AdminPublicationOut])
def list_admin_publications(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[AdminPublicationOut]:
    query = select(Publication)
    if user.role == "contributor":
        query = query.where(or_(Publication.is_published.is_(True), Publication.created_by_id == user.id))
    rows = db.scalars(query.order_by(Publication.year.desc(), Publication.created_at.desc(), Publication.id.desc())).all()
    return [AdminPublicationOut.model_validate(row) for row in rows]


@app.put("/api/admin/publications/{publication_id}", response_model=AdminPublicationOut)
def update_publication(publication_id: int, payload: PublicationPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AdminPublicationOut:
    row = db.get(Publication, publication_id)
    if not row:
        raise HTTPException(status_code=404, detail="Publication not found")
    can_edit_own_content = user.role == "contributor" and row.created_by_id == user.id
    if user.role != "admin" and not can_edit_own_content:
        raise HTTPException(status_code=403, detail="You can only edit your own publication submissions")
    values = payload.model_dump()
    if user.role == "contributor":
        if row.is_published:
            save_submission(
                db,
                user,
                "publication",
                "update",
                row.id,
                payload.model_dump(mode="json") | {"status": "Pending review", "is_published": False, "featured": False},
                payload.title,
                f"{payload.authors} · {payload.venue} · {payload.year}",
            )
            db.commit()
            db.refresh(row)
            return AdminPublicationOut.model_validate(row)
        values.update(status="Pending review", is_published=False, featured=False)
    elif values["is_published"]: values["status"] = "Published"
    elif values["status"] == "Published": values["status"] = "Pending review"
    for key, value in values.items():
        setattr(row, key, value)
    if user.role == "admin":
        sync_pending_submission(
            db,
            "publication",
            row.id,
            payload.model_dump(mode="json"),
            row.title,
            f"{row.authors} · {row.venue} · {row.year}",
        )
    else:
        save_submission(
            db,
            user,
            "publication",
            "create",
            row.id,
            payload.model_dump(mode="json") | {"status": "Pending review", "is_published": False, "featured": False},
            row.title,
            f"{row.authors} · {row.venue} · {row.year}",
        )
    db.commit()
    db.refresh(row)
    return AdminPublicationOut.model_validate(row)


@app.delete("/api/admin/publications/{publication_id}")
def delete_publication(publication_id: int, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> dict[str, bool]:
    row = db.get(Publication, publication_id)
    if not row:
        raise HTTPException(status_code=404, detail="Publication not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.post("/api/admin/upload")
def upload_file(file: UploadFile = File(...), _user: User = Depends(require_roles("admin", "contributor"))) -> dict[str, str]:
    allowed = {"application/pdf", "image/png", "image/jpeg", "image/webp", "video/mp4"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only PDF, image, and MP4 files are supported")
    max_bytes = 50 * 1024 * 1024
    safe_name = Path(file.filename or "upload.bin").name
    target = Path(settings.media_root) / f"{uuid.uuid4().hex}-{safe_name}"
    with target.open("wb") as output:
        size = 0
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Upload is limited to 50 MB")
            output.write(chunk)
    return {"url": f"/media/{target.name}"}


def store_feedback_screenshot(file: UploadFile) -> dict[str, str]:
    allowed = {"image/png", "image/jpeg", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Feedback screenshots must be PNG, JPEG, or WebP images")
    max_bytes = 10 * 1024 * 1024
    safe_name = Path(file.filename or "feedback-screenshot").name
    target = Path(settings.media_root) / f"feedback-{uuid.uuid4().hex}-{safe_name}"
    with target.open("wb") as output:
        size = 0
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Feedback screenshots are limited to 10 MB")
            output.write(chunk)
    return {"url": f"/media/{target.name}"}


@app.post("/api/feedback/upload")
def upload_feedback_screenshot(file: UploadFile = File(...)) -> dict[str, str]:
    return store_feedback_screenshot(file)


@app.get("/api/feedback", response_model=list[FeedbackOut])
def list_feedback(db: Session = Depends(get_db)) -> list[FeedbackOut]:
    rows = db.scalars(select(Feedback).order_by(Feedback.created_at.desc(), Feedback.id.desc())).all()
    return [FeedbackOut.model_validate(row) for row in rows]


@app.post("/api/feedback", response_model=FeedbackOut, status_code=201)
def create_feedback(payload: FeedbackPayload, db: Session = Depends(get_db)) -> FeedbackOut:
    if payload.screenshot_url and not payload.screenshot_url.startswith("/media/"):
        raise HTTPException(status_code=400, detail="Screenshot URL must point to an uploaded media file")
    row = Feedback(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return FeedbackOut.model_validate(row)


@app.post("/api/feedback/{feedback_id}/like", response_model=FeedbackOut)
def like_feedback(feedback_id: int, db: Session = Depends(get_db)) -> FeedbackOut:
    row = db.get(Feedback, feedback_id)
    if not row:
        raise HTTPException(status_code=404, detail="Feedback not found")
    row.likes_count += 1
    db.commit(); db.refresh(row)
    return FeedbackOut.model_validate(row)


@app.post("/api/feedback/{feedback_id}/resolve", response_model=FeedbackOut)
def resolve_feedback(feedback_id: int, db: Session = Depends(get_db)) -> FeedbackOut:
    row = db.get(Feedback, feedback_id)
    if not row:
        raise HTTPException(status_code=404, detail="Feedback not found")
    row.is_resolved = not row.is_resolved
    db.commit(); db.refresh(row)
    return FeedbackOut.model_validate(row)


@app.patch("/api/admin/feedback/{feedback_id}", response_model=FeedbackOut)
def update_feedback_status(feedback_id: int, payload: FeedbackStatusPayload, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> FeedbackOut:
    row = db.get(Feedback, feedback_id)
    if not row:
        raise HTTPException(status_code=404, detail="Feedback not found")
    row.is_resolved = payload.is_resolved
    db.commit(); db.refresh(row)
    return FeedbackOut.model_validate(row)


@app.get("/api/admin/people", response_model=list[AdminPersonOut])
def list_admin_people(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[AdminPersonOut]:
    query = select(Person)
    if user.role == "contributor":
        query = query.where(or_(Person.is_visible.is_(True), Person.created_by_id == user.id, func.lower(Person.email) == user.email.strip().lower()))
    rows = db.scalars(query.order_by(Person.sort_order, Person.id)).all()
    return [admin_person_response(row, db) for row in rows]


def admin_person_response(row: Person, db: Session) -> AdminPersonOut:
    linked_user = None
    if row.email:
        linked_user = db.scalar(select(User).where(func.lower(User.email) == row.email.strip().lower()))
    return AdminPersonOut.model_validate(row).model_copy(update={
        "account_id": linked_user.id if linked_user else None,
        "account_email": linked_user.email if linked_user else None,
        "account_role": linked_user.role if linked_user else None,
    })


def person_for_user(user: User, db: Session) -> Person | None:
    row = db.scalar(select(Person).where(Person.created_by_id == user.id).order_by(Person.id).limit(1))
    if row:
        return row
    return db.scalar(select(Person).where(func.lower(Person.email) == user.email.strip().lower()).order_by(Person.id).limit(1))


@app.get("/api/admin/profile", response_model=AdminPersonOut | None)
def get_my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AdminPersonOut | None:
    row = person_for_user(user, db)
    return admin_person_response(row, db) if row else None


@app.put("/api/admin/profile", response_model=AdminPersonOut)
def upsert_my_profile(payload: PersonPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AdminPersonOut:
    row = person_for_user(user, db)
    values = payload.model_dump()
    values["email"] = user.email
    if user.role == "contributor":
        values["is_visible"] = False
    if row:
        if user.role == "contributor" and row.is_visible:
            save_submission(
                db,
                user,
                "person",
                "update",
                row.id,
                payload.model_dump(mode="json") | {"email": user.email, "is_visible": False},
                payload.name,
                f"{payload.role} · {payload.group}",
            )
            db.commit()
            db.refresh(row)
            return admin_person_response(row, db)
        if row.created_by_id is None:
            row.created_by_id = user.id
        for key, value in values.items():
            setattr(row, key, value)
    else:
        values["created_by_id"] = user.id
        values["sort_order"] = (db.scalar(select(func.max(Person.sort_order))) or 0) + 1
        row = Person(**values)
        db.add(row)
        db.flush()
    if user.role == "contributor":
        save_submission(
            db,
            user,
            "person",
            "create",
            row.id,
            payload.model_dump(mode="json") | {"email": user.email, "is_visible": False},
            row.name,
            f"{row.role} · {row.group}",
        )
    else:
        sync_pending_submission(db, "person", row.id, payload.model_dump(mode="json"), row.name, f"{row.role} · {row.group}")
    db.commit()
    db.refresh(row)
    return admin_person_response(row, db)


@app.post("/api/admin/people", response_model=AdminPersonOut, status_code=201)
def create_person(payload: PersonPayload, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))) -> AdminPersonOut:
    values = payload.model_dump()
    values["created_by_id"] = user.id
    values["sort_order"] = (db.scalar(select(func.max(Person.sort_order))) or 0) + 1
    row = Person(**values)
    db.add(row)
    db.commit()
    db.refresh(row)
    return admin_person_response(row, db)


@app.put("/api/admin/people/{person_id}", response_model=AdminPersonOut)
def update_person(person_id: int, payload: PersonPayload, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> AdminPersonOut:
    row = db.get(Person, person_id)
    if not row:
        raise HTTPException(status_code=404, detail="Person not found")
    owns_profile = row.created_by_id == user.id or (row.email and row.email.strip().lower() == user.email.strip().lower())
    can_edit_own_profile = user.role == "contributor" and owns_profile
    if user.role != "admin" and not can_edit_own_profile:
        raise HTTPException(status_code=403, detail="Only admins can update published profiles")
    values = payload.model_dump()
    if user.role == "contributor" and row.is_visible:
        save_submission(
            db,
            user,
            "person",
            "update",
            row.id,
            payload.model_dump(mode="json") | {"email": user.email, "is_visible": False},
            payload.name,
            f"{payload.role} · {payload.group}",
        )
        db.commit()
        db.refresh(row)
        return admin_person_response(row, db)
    if user.role == "contributor":
        values["is_visible"] = False
        values["email"] = user.email
    for key, value in values.items():
        setattr(row, key, value)
    if user.role == "admin":
        sync_pending_submission(db, "person", row.id, payload.model_dump(mode="json"), row.name, f"{row.role} · {row.group}")
    else:
        save_submission(
            db,
            user,
            "person",
            "create",
            row.id,
            payload.model_dump(mode="json") | {"email": user.email, "is_visible": False},
            row.name,
            f"{row.role} · {row.group}",
        )
    db.commit(); db.refresh(row)
    return admin_person_response(row, db)


@app.delete("/api/admin/people/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> dict[str, bool]:
    row = db.get(Person, person_id)
    if not row:
        raise HTTPException(status_code=404, detail="Person not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.patch("/api/admin/people/{person_id}/account-role", response_model=AdminPersonOut)
def update_person_account_role(person_id: int, payload: AccountRolePayload, db: Session = Depends(get_db), owner: User = Depends(require_roles("admin"))) -> AdminPersonOut:
    row = db.get(Person, person_id)
    if not row:
        raise HTTPException(status_code=404, detail="Person not found")
    if not row.email:
        raise HTTPException(status_code=400, detail="Add an email to this profile before setting account access")
    linked_user = db.scalar(select(User).where(func.lower(User.email) == row.email.strip().lower()))
    if not linked_user:
        raise HTTPException(status_code=400, detail="No registered account matches this profile email")
    if linked_user.id == owner.id:
        raise HTTPException(status_code=400, detail="Your Admin account cannot be changed from this page")
    if payload.role == "admin" and linked_user.role != "admin":
        admin_count = db.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
        if admin_count >= MAX_ADMIN_COUNT:
            raise HTTPException(status_code=400, detail="The lab can have at most five admins")
    linked_user.role = payload.role
    db.commit()
    db.refresh(row)
    return admin_person_response(row, db)


def apply_submission_payload(submission: Submission, db: Session, *, publish: bool) -> int:
    payload = dict(submission.payload or {})
    if submission.content_id is None:
        raise HTTPException(status_code=400, detail="Submission is missing its content record")
    if submission.content_type == "news":
        row = db.get(NewsItem, submission.content_id)
        if not row:
            raise HTTPException(status_code=404, detail="News item not found")
        if isinstance(payload.get("date"), str):
            payload["date"] = date.fromisoformat(payload["date"])
        for key in ("date", "title", "body", "href", "tag"):
            if key in payload:
                setattr(row, key, payload[key])
        if publish:
            row.is_published = True
        return row.id
    if submission.content_type == "publication":
        row = db.get(Publication, submission.content_id)
        if not row:
            raise HTTPException(status_code=404, detail="Publication not found")
        for key in ("title", "authors", "venue", "venue_short", "year", "type", "abstract", "paper_url", "pdf_url", "code_url", "video_url", "thumbnail_url"):
            if key in payload:
                setattr(row, key, payload[key])
        if publish:
            row.status = "Published"
            row.is_published = True
        return row.id
    if submission.content_type == "person":
        row = db.get(Person, submission.content_id)
        if not row:
            raise HTTPException(status_code=404, detail="Person not found")
        for key in ("name", "role", "group", "education_level", "enrollment_year", "destination", "bio", "research_interests", "email", "website_url", "avatar_url"):
            if key in payload:
                setattr(row, key, payload[key])
        if publish:
            row.is_visible = True
        return row.id
    raise HTTPException(status_code=400, detail="Unsupported review content type")


def approve_submission(submission: Submission, db: Session, reviewer: User) -> ReviewActionOut:
    content_id = apply_submission_payload(submission, db, publish=True)
    submission.status = "approved"
    submission.reviewed_at = now_utc()
    submission.reviewed_by_id = reviewer.id
    db.commit()
    return ReviewActionOut(id=content_id, content_type=submission.content_type, status="approved")


def reject_submission(submission: Submission, db: Session, reviewer: User) -> ReviewActionOut:
    content_id = submission.content_id or 0
    if submission.action == "create" and submission.content_id is not None:
        if submission.content_type == "news":
            row = db.get(NewsItem, submission.content_id)
        elif submission.content_type == "publication":
            row = db.get(Publication, submission.content_id)
        else:
            row = db.get(Person, submission.content_id)
        if row:
            db.delete(row)
    submission.status = "rejected"
    submission.reviewed_at = now_utc()
    submission.reviewed_by_id = reviewer.id
    db.commit()
    return ReviewActionOut(id=content_id, content_type=submission.content_type, status="rejected")


@app.get("/api/admin/review-queue", response_model=list[ReviewQueueItem])
def list_review_queue(db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> list[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []
    pending_submissions = db.scalars(select(Submission).where(Submission.status == "pending").order_by(Submission.created_at.desc(), Submission.id.desc())).all()
    pending_keys = {(row.content_type, row.content_id) for row in pending_submissions}
    for row in pending_submissions:
        submitter = db.get(User, row.submitted_by_id)
        items.append(ReviewQueueItem(
            id=row.content_id or row.id,
            content_type=row.content_type,
            title=row.title,
            summary=row.summary,
            status="Pending review",
            created_by_id=row.submitted_by_id,
            created_at=row.created_at,
            submission_id=row.id,
            action=row.action,
            submitted_by_name=submitter.full_name if submitter else None,
        ))
    for row in db.scalars(select(NewsItem).where(NewsItem.is_published.is_(False)).order_by(NewsItem.date.desc(), NewsItem.id.desc())).all():
        if ("news", row.id) not in pending_keys:
            submitter = db.get(User, row.created_by_id) if row.created_by_id else None
            items.append(ReviewQueueItem(id=row.id, content_type="news", title=row.title, summary=row.body, status="Pending review", created_by_id=row.created_by_id, action="create", submitted_by_name=submitter.full_name if submitter else None))
    for row in db.scalars(select(Publication).where((Publication.is_published.is_(False)) | (Publication.status == "Draft")).order_by(Publication.year.desc(), Publication.id.desc())).all():
        if ("publication", row.id) not in pending_keys:
            submitter = db.get(User, row.created_by_id) if row.created_by_id else None
            items.append(ReviewQueueItem(id=row.id, content_type="publication", title=row.title, summary=f"{row.authors} · {row.venue} · {row.year}", status="Pending review", created_by_id=row.created_by_id, action="create", submitted_by_name=submitter.full_name if submitter else None))
    for row in db.scalars(select(Person).where(Person.is_visible.is_(False)).order_by(Person.id.desc())).all():
        if ("person", row.id) not in pending_keys:
            submitter = db.get(User, row.created_by_id) if row.created_by_id else None
            items.append(ReviewQueueItem(id=row.id, content_type="person", title=row.name, summary=f"{row.role} · {row.group}", status="Pending review", created_by_id=row.created_by_id, action="create", submitted_by_name=submitter.full_name if submitter else None))
    return items


@app.post("/api/admin/submissions/{submission_id}/approve", response_model=ReviewActionOut)
def approve_submission_route(submission_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))) -> ReviewActionOut:
    submission = db.get(Submission, submission_id)
    if not submission or submission.status != "pending":
        raise HTTPException(status_code=404, detail="Pending submission not found")
    return approve_submission(submission, db, user)


@app.post("/api/admin/submissions/{submission_id}/reject", response_model=ReviewActionOut)
def reject_submission_route(submission_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))) -> ReviewActionOut:
    submission = db.get(Submission, submission_id)
    if not submission or submission.status != "pending":
        raise HTTPException(status_code=404, detail="Pending submission not found")
    return reject_submission(submission, db, user)


@app.get("/api/admin/my-submissions", response_model=list[SubmissionOut])
def list_my_submissions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[SubmissionOut]:
    rows = db.scalars(
        select(Submission)
        .where(Submission.submitted_by_id == user.id, Submission.status != "cleared")
        .order_by(Submission.created_at.desc(), Submission.id.desc())
    ).all()
    return [submission_out(row) for row in rows]


@app.post("/api/admin/submissions/{submission_id}/withdraw", response_model=ReviewActionOut)
def withdraw_submission(submission_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ReviewActionOut:
    submission = db.get(Submission, submission_id)
    if not submission or submission.submitted_by_id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending submissions can be withdrawn")
    content_id = submission.content_id or 0
    if submission.action == "create" and submission.content_id is not None:
        if submission.content_type == "news":
            row = db.get(NewsItem, submission.content_id)
        elif submission.content_type == "publication":
            row = db.get(Publication, submission.content_id)
        else:
            row = db.get(Person, submission.content_id)
        if row:
            db.delete(row)
    submission.status = "withdrawn"
    submission.reviewed_at = now_utc()
    db.commit()
    return ReviewActionOut(id=content_id, content_type=submission.content_type, status="withdrawn")


@app.post("/api/admin/submissions/{submission_id}/clear", response_model=ReviewActionOut)
def clear_submission(submission_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ReviewActionOut:
    submission = db.get(Submission, submission_id)
    if not submission or submission.submitted_by_id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.status not in {"approved", "rejected", "withdrawn"}:
        raise HTTPException(status_code=400, detail="Only resolved submissions can be cleared")
    submission.status = "cleared"
    submission.cleared_at = now_utc()
    db.commit()
    return ReviewActionOut(id=submission.content_id or 0, content_type=submission.content_type, status="cleared")


@app.post("/api/admin/review-queue/{content_type}/{content_id}/publish", response_model=ReviewActionOut)
def publish_review_item(content_type: str, content_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))) -> ReviewActionOut:
    submission = db.scalar(
        select(Submission)
        .where(Submission.content_type == content_type, Submission.content_id == content_id, Submission.status == "pending")
        .order_by(Submission.id.desc())
    )
    if submission:
        return approve_submission(submission, db, user)
    if content_type == "news":
        row = db.get(NewsItem, content_id)
        if not row:
            raise HTTPException(status_code=404, detail="News item not found")
        row.is_published = True
    elif content_type == "publication":
        row = db.get(Publication, content_id)
        if not row:
            raise HTTPException(status_code=404, detail="Publication not found")
        row.status = "Published"
        row.is_published = True
    elif content_type == "person":
        row = db.get(Person, content_id)
        if not row:
            raise HTTPException(status_code=404, detail="Person not found")
        row.is_visible = True
    else:
        raise HTTPException(status_code=400, detail="Unsupported review content type")
    db.commit()
    return ReviewActionOut(id=content_id, content_type=content_type, status="published")


@app.get("/api/admin/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> list[UserOut]:
    return [UserOut.model_validate(user) for user in db.scalars(select(User).order_by(User.created_at)).all()]


@app.post("/api/admin/users", response_model=UserOut)
def create_user(payload: CreateUserRequest, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin"))) -> UserOut:
    if db.scalar(select(User).where(User.email == payload.email.lower().strip())):
        raise HTTPException(status_code=409, detail="Email already exists")
    if payload.role == "admin":
        admin_count = db.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
        if admin_count >= MAX_ADMIN_COUNT:
            raise HTTPException(status_code=400, detail="The lab can have at most five admins")
    row = User(email=payload.email.lower().strip(), full_name=payload.full_name, password_hash=hash_password(payload.password), role=payload.role)
    db.add(row); db.commit(); db.refresh(row)
    return UserOut.model_validate(row)


@app.patch("/api/admin/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UpdateUserRequest, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> UserOut:
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    would_lose_admin_access = row.id == current_user.id and ((payload.role is not None and payload.role != "admin") or payload.is_active is False)
    if would_lose_admin_access:
        raise HTTPException(status_code=400, detail="You cannot remove your own Admin access")
    if payload.role == "admin" and row.role != "admin":
        admin_count = db.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
        if admin_count >= MAX_ADMIN_COUNT:
            raise HTTPException(status_code=400, detail="The lab can have at most five admins")
    removes_active_owner = row.role == "admin" and (payload.role is not None and payload.role != "admin" or payload.is_active is False)
    if removes_active_owner:
        active_owner_count = db.scalar(select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))) or 0
        if active_owner_count <= 1:
            raise HTTPException(status_code=400, detail="At least one active Admin account is required")
    if payload.full_name is not None:
        row.full_name = payload.full_name.strip()
    if payload.role is not None:
        row.role = payload.role
    if payload.is_active is not None:
        row.is_active = payload.is_active
    db.commit(); db.refresh(row)
    return UserOut.model_validate(row)


@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))) -> dict[str, bool]:
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own Admin account")
    if row.role == "admin" and row.is_active:
        active_admin_count = db.scalar(select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))) or 0
        if active_admin_count <= 1:
            raise HTTPException(status_code=400, detail="At least one active Admin account is required")
    db.delete(row)
    db.commit()
    return {"deleted": True}
