from __future__ import annotations

from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: Literal["admin", "contributor"]
    is_active: bool


class LoginResponse(BaseModel):
    token: str
    user: UserOut


class SettingsPayload(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    short_name: str = Field(min_length=1, max_length=80)
    tagline: str = Field(min_length=1, max_length=300)
    description: str = Field(min_length=1)
    location: str = Field(min_length=1, max_length=240)
    email: str = Field(min_length=3, max_length=255)
    hero_kicker: str = Field(default="Robotics · Learning · Trust", max_length=180)
    hero_image_url: str = ""
    google_scholar_url: str | None = None
    github_url: str | None = None


class SettingsOut(SettingsPayload):
    model_config = ConfigDict(from_attributes=True)
    visit_count: int = 0
    started_at: datetime | None = None


class NewsPayload(BaseModel):
    date: date_type | None = None
    title: str = Field(min_length=1, max_length=240)
    body: str = Field(min_length=1)
    href: str | None = None
    tag: str | None = None
    is_published: bool = True


class NewsOut(NewsPayload):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ResearchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    kicker: str
    title: str
    description: str
    accent: str


class PersonPayload(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=120)
    group: str = "Students"
    bio: str | None = None
    research_interests: list[str] = []
    email: str | None = None
    website_url: str | None = None
    avatar_url: str | None = None
    is_visible: bool = True


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    role: str
    group: str
    bio: str | None
    research_interests: list[str]
    email: str | None
    website_url: str | None
    avatar_url: str | None


class AdminPersonOut(PersonOut):
    is_visible: bool
    created_by_id: int | None
    account_id: int | None = None
    account_email: str | None = None
    account_role: Literal["admin", "contributor"] | None = None


class ReviewQueueItem(BaseModel):
    id: int
    content_type: Literal["news", "publication", "person"]
    title: str
    summary: str
    status: str
    created_by_id: int | None = None


class ReviewActionOut(BaseModel):
    id: int
    content_type: Literal["news", "publication", "person"]
    status: Literal["published"]


class AccountRolePayload(BaseModel):
    role: Literal["contributor", "admin"]


class PublicationPayload(BaseModel):
    title: str = Field(min_length=1, max_length=320)
    authors: str = Field(min_length=1)
    venue: str = Field(min_length=1, max_length=240)
    venue_short: str | None = Field(default=None, max_length=80)
    year: int = Field(ge=1900, le=2200)
    type: str = "Preprint"
    status: str = "Pending review"
    abstract: str | None = None
    paper_url: str | None = None
    pdf_url: str | None = None
    code_url: str | None = None
    video_url: str | None = None
    thumbnail_url: str | None = None
    featured: bool = False
    is_published: bool = True


class PublicationOut(PublicationPayload):
    model_config = ConfigDict(from_attributes=True)
    id: int


class AdminPublicationOut(PublicationOut):
    created_by_id: int | None


class FeedbackPayload(BaseModel):
    author_name: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=4000)
    screenshot_url: str | None = None


class FeedbackOut(FeedbackPayload):
    model_config = ConfigDict(from_attributes=True)
    id: int
    likes_count: int
    is_resolved: bool
    created_at: datetime


class FeedbackStatusPayload(BaseModel):
    is_resolved: bool


class HomeOut(BaseModel):
    settings: SettingsOut
    news: list[NewsOut]
    research: list[ResearchOut]
    people: list[PersonOut]
    publications: list[PublicationOut]


class VisitOut(BaseModel):
    visit_count: int


class CreateUserRequest(BaseModel):
    email: str
    full_name: str
    password: str = Field(min_length=8)
    role: Literal["contributor", "admin"] = "contributor"


class UpdateUserRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    role: Literal["contributor", "admin"] | None = None
    is_active: bool | None = None
