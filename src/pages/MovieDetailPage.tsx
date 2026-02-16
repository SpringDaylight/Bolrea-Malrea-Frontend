import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import MainLayout from "../components/layout/MainLayout";
import { useLocation, useParams } from "react-router-dom";
import { getMovie, getMovieReviews, type Movie, type Review } from "../api/A2_movies";
import {
  createReview,
  createReviewComment,
  deleteReview,
  getReviewComments,
  updateReview,
  toggleReviewLike,
  type Comment as ReviewComment,
} from "../api/A6_reviews";
import { getCurrentUserReviews, getUser } from "../api/A7_profile";
import {
  getCurrentUserWatchedMovies,
  saveCurrentUserWatchedMovie,
  getLocalWatchedMovies,
  upsertLocalWatchedMovie,
} from "../api/A8_watched";
import { 
  explainPrediction,
  type SatisfactionPrediction,
  type PredictionExplanation 
} from "../api/ml";
import { calculateMovieMatchRate } from "../utils/matchRateCalculator";

const REVIEW_VISIBILITY_STORAGE_KEY = "mw_review_visibility";
const LEGACY_REVIEW_STORAGE_KEY = "mw_my_reviews";
const REVIEW_REACTION_STORAGE_KEY = "mw_review_reactions";
const REVIEW_COMMENT_STORAGE_KEY = "mw_review_comments";
const REVIEW_CONTENT_MAX_LENGTH = 500;

const formatRatingLabel = (rating: number) =>
  Number.isInteger(rating) ? `${rating}` : rating.toFixed(1);

const formatDateTime = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "날짜 정보 없음";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeReviewRating = (value: number) => {
  if (!Number.isFinite(value)) return 5;
  return Math.max(0.5, Math.min(5, Math.round(value * 2) / 2));
};

type ReviewVisibility = "public" | "private";
type ReviewVisibilityMap = Record<string, ReviewVisibility>;
type ReviewReaction = "like" | "dislike";
type ReviewReactionMap = Record<string, ReviewReaction>;

const getStoredReviewReactions = (userId: string | null): ReviewReactionMap => {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`${REVIEW_REACTION_STORAGE_KEY}:${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<ReviewReactionMap>((acc, [key, value]) => {
      if (value === "like" || value === "dislike") {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch (err) {
    console.error("Failed to parse review reactions storage:", err);
    return {};
  }
};

const setStoredReviewReactions = (userId: string | null, next: ReviewReactionMap) => {
  if (!userId) return;
  try {
    localStorage.setItem(
      `${REVIEW_REACTION_STORAGE_KEY}:${userId}`,
      JSON.stringify(next)
    );
  } catch (err) {
    console.error("Failed to save review reactions storage:", err);
  }
};

const normalizeReviewVisibility = (value: unknown): ReviewVisibility =>
  value === "private" ? "private" : "public";

const getReviewVisibilityMeta = (visibility: ReviewVisibility) =>
  visibility === "private"
    ? { className: "is-private", label: "비공개 리뷰" }
    : { className: "is-public", label: "공개 리뷰" };

const getStarFillPercent = (rating: number, starNumber: number) => {
  const normalized = normalizeReviewRating(rating);
  const fill = Math.max(0, Math.min(1, normalized - (starNumber - 1)));
  return Math.round(fill * 100);
};

const buildVisibilityKey = (
  movieId: string | number,
  ownerUserId: string
) => `${ownerUserId}:${String(movieId)}`;

const buildReviewVisibilityKey = (reviewId: number | string) =>
  `review:${String(reviewId)}`;

const getStoredReviewVisibilityMap = (): ReviewVisibilityMap => {
  try {
    const raw = localStorage.getItem(REVIEW_VISIBILITY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<ReviewVisibilityMap>((acc, [key, value]) => {
      acc[key] = normalizeReviewVisibility(value);
      return acc;
    }, {});
  } catch (err) {
    console.error("Failed to parse review visibility storage:", err);
    return {};
  }
};

const getLegacyStoredVisibility = (movieId: string | number): ReviewVisibility | null => {
  try {
    const raw = localStorage.getItem(LEGACY_REVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Array<{ movieId?: unknown; visibility?: unknown }>;
    if (!Array.isArray(parsed)) return null;

    const targetMovieId = String(movieId);
    const match = parsed.find((item) => String(item?.movieId ?? "") === targetMovieId);
    if (!match) return null;
    return normalizeReviewVisibility(match.visibility);
  } catch (err) {
    console.error("Failed to parse legacy review storage:", err);
    return null;
  }
};

const getSavedReviewVisibility = ({
  movieId,
  ownerUserId,
  currentUserId,
  reviewId,
}: {
  movieId: string | number;
  ownerUserId?: string | null;
  currentUserId?: string | null;
  reviewId?: number | null;
}): ReviewVisibility => {
  const savedMap = getStoredReviewVisibilityMap();
  if (typeof reviewId === "number") {
    const reviewKey = buildReviewVisibilityKey(reviewId);
    if (savedMap[reviewKey]) return savedMap[reviewKey];
  }

  if (ownerUserId) {
    const scopedKey = buildVisibilityKey(movieId, ownerUserId);
    if (savedMap[scopedKey]) return savedMap[scopedKey];
  }

  // Legacy visibility는 현재 로그인 사용자 본인 리뷰에만 적용
  if (ownerUserId && currentUserId && ownerUserId === currentUserId) {
    const legacyVisibility = getLegacyStoredVisibility(movieId);
    if (legacyVisibility) return legacyVisibility;
  }

  return "public";
};

const saveReviewVisibility = (
  {
    movieId,
    ownerUserId,
    reviewId,
    visibility,
  }: {
    movieId: string | number;
    ownerUserId: string;
    reviewId?: number | null;
    visibility: ReviewVisibility;
  }
) => {
  try {
    const savedMap = getStoredReviewVisibilityMap();
    const nextMap: ReviewVisibilityMap = {
      ...savedMap,
      [buildVisibilityKey(movieId, ownerUserId)]: visibility,
    };
    if (typeof reviewId === "number") {
      nextMap[buildReviewVisibilityKey(reviewId)] = visibility;
    }
    localStorage.setItem(REVIEW_VISIBILITY_STORAGE_KEY, JSON.stringify(nextMap));
  } catch (err) {
    console.error("Failed to save review visibility:", err);
  }
};

const removeSavedReviewVisibility = (
  {
    movieId,
    ownerUserId,
    reviewId,
  }: {
    movieId: string | number;
    ownerUserId: string;
    reviewId?: number | null;
  }
) => {
  try {
    const savedMap = getStoredReviewVisibilityMap();
    const key = buildVisibilityKey(movieId, ownerUserId);
    if (key in savedMap) {
      delete savedMap[key];
    }
    if (typeof reviewId === "number") {
      const reviewKey = buildReviewVisibilityKey(reviewId);
      if (reviewKey in savedMap) {
        delete savedMap[reviewKey];
      }
    }
    localStorage.setItem(REVIEW_VISIBILITY_STORAGE_KEY, JSON.stringify(savedMap));
  } catch (err) {
    console.error("Failed to remove review visibility:", err);
  }
};

const removeLegacyStoredVisibility = (movieId: string | number) => {
  try {
    const raw = localStorage.getItem(LEGACY_REVIEW_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<{ movieId?: unknown }>;
    if (!Array.isArray(parsed)) return;

    const targetMovieId = String(movieId);
    const next = parsed.filter(
      (item) => String(item?.movieId ?? "") !== targetMovieId
    );
    localStorage.setItem(LEGACY_REVIEW_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("Failed to remove legacy review storage:", err);
  }
};

const buildReviewCommentStorageKey = (reviewId: number | string) =>
  `${REVIEW_COMMENT_STORAGE_KEY}:${String(reviewId)}`;

const parseStoredComments = (
  raw: string | null,
  reviewId: number
): ReviewComment[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: Number((item as { id?: unknown }).id ?? Date.now()),
        review_id: reviewId,
        user_id: String((item as { user_id?: unknown }).user_id ?? "guest"),
        content: String((item as { content?: unknown }).content ?? "").trim(),
        created_at: String(
          (item as { created_at?: unknown }).created_at ?? new Date().toISOString()
        ),
      }))
      .filter((item) => item.content.length > 0);
  } catch (err) {
    console.error("Failed to parse review comments storage:", err);
    return [];
  }
};

const getLocalReviewComments = (reviewId: number): ReviewComment[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(buildReviewCommentStorageKey(reviewId));
  return parseStoredComments(raw, reviewId);
};

const saveLocalReviewComments = (reviewId: number, items: ReviewComment[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      buildReviewCommentStorageKey(reviewId),
      JSON.stringify(items)
    );
  } catch (err) {
    console.error("Failed to save review comments storage:", err);
  }
};

const createLocalReviewComment = (
  reviewId: number,
  userId: string,
  content: string
): ReviewComment => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  review_id: reviewId,
  user_id: userId,
  content,
  created_at: new Date().toISOString(),
});

const mergeReviewComments = (
  primary: ReviewComment[],
  secondary: ReviewComment[]
) => {
  const map = new Map<number, ReviewComment>();
  [...secondary, ...primary].forEach((comment) => {
    if (!comment || !Number.isFinite(comment.id)) return;
    map.set(comment.id, comment);
  });
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

export default function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const location = useLocation();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reactions, setReactions] = useState<
    Record<number, { likes: number; dislikes: number }>
  >({});
  const [myReviewReactions, setMyReviewReactions] = useState<
    Record<number, ReviewReaction | null>
  >({});
  const [myReviewOpen, setMyReviewOpen] = useState(false);
  const [isEditingMyReview, setIsEditingMyReview] = useState(false);
  const [myReviewContent, setMyReviewContent] = useState("");
  const [myReviewRating, setMyReviewRating] = useState(5);
  const [hoverReviewRating, setHoverReviewRating] = useState<number | null>(null);
  const [myReviewVisibility, setMyReviewVisibility] =
    useState<ReviewVisibility>("public");
  const [personalReviewVisibility, setPersonalReviewVisibility] =
    useState<ReviewVisibility>("public");
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [showReviewLoginMessage, setShowReviewLoginMessage] = useState(false);
  const [reviewLoginMessageTick, setReviewLoginMessageTick] = useState(0);
  const [isMovieWatched, setIsMovieWatched] = useState(false);
  const [reviewDeleteConfirmOpen, setReviewDeleteConfirmOpen] = useState(false);
  const [isPersonalReviewDeleted, setIsPersonalReviewDeleted] = useState(false);
  const [isSavingMyReview, setIsSavingMyReview] = useState(false);
  const [isDeletingMyReview, setIsDeletingMyReview] = useState(false);
  const [myReviewErrorMessage, setMyReviewErrorMessage] = useState<string | null>(
    null
  );
  const [localPersonalReview, setLocalPersonalReview] = useState<Review | null>(
    null
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<number, boolean>>({});
  const [commentOpen, setCommentOpen] = useState<Record<number, boolean>>({});
  const [reviewComments, setReviewComments] = useState<
    Record<number, ReviewComment[]>
  >({});
  const [commentLoading, setCommentLoading] = useState<Record<number, boolean>>(
    {}
  );
  const [commentErrors, setCommentErrors] = useState<Record<number, string | null>>(
    {}
  );
  const [reviewAuthorNames, setReviewAuthorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<SatisfactionPrediction | null>(null);
  const [explanation, setExplanation] = useState<PredictionExplanation | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const visibilitySelectRef = useRef<HTMLDivElement | null>(null);
  const isLoggedIn = localStorage.getItem("mw_logged_in") === "true";
  const currentUserPk = localStorage.getItem("mw_user_pk");
  const personalReview = isPersonalReviewDeleted
    ? null
    : localPersonalReview;
  const personalReviewDate = personalReview?.created_at
    ? formatDateTime(personalReview.created_at)
    : formatDateTime();
  const previewReviewRating = hoverReviewRating ?? myReviewRating;
  const currentUserNickname =
    localStorage.getItem("mw_profile_nickname") ||
    localStorage.getItem("mw_profile_name") ||
    "나";

  const getDisplayAuthorName = (authorId: string) => {
    if (currentUserPk && authorId === currentUserPk) {
      return currentUserNickname;
    }
    return reviewAuthorNames[authorId] || authorId;
  };

  useEffect(() => {
    setIsPersonalReviewDeleted(false);
    setReviewDeleteConfirmOpen(false);
    setIsEditingMyReview(false);
    setIsSavingMyReview(false);
    setIsDeletingMyReview(false);
    setMyReviewErrorMessage(null);
    setHoverReviewRating(null);
    setIsVisibilityOpen(false);
    const nextVisibility = movieId
      ? getSavedReviewVisibility({
          movieId,
          ownerUserId: currentUserPk,
          currentUserId: currentUserPk,
        })
      : "public";
    setMyReviewVisibility(nextVisibility);
    setPersonalReviewVisibility(nextVisibility);
  }, [movieId, currentUserPk]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        visibilitySelectRef.current &&
        !visibilitySelectRef.current.contains(event.target)
      ) {
        setIsVisibilityOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!movieId) return;
    const nextVisibility = getSavedReviewVisibility({
      movieId,
      ownerUserId: currentUserPk,
      currentUserId: currentUserPk,
    });
    setMyReviewVisibility(nextVisibility);
    setPersonalReviewVisibility(nextVisibility);

    if (!isLoggedIn) {
      setLocalPersonalReview(null);
      return;
    }

    const userId = currentUserPk;
    if (!userId) {
      setLocalPersonalReview(null);
      return;
    }

    let isCancelled = false;

    const fetchPersonalReview = async () => {
      try {
        const myReviews = await getCurrentUserReviews(userId, {
          page: 1,
          page_size: 100,
        });
        if (isCancelled) return;

        const scopedReviews = myReviews.reviews.filter(
          (item) => String(item.user_id) === String(userId)
        );
        const match = scopedReviews.find(
          (item) => String(item.movie_id) === String(movieId)
        );
        setLocalPersonalReview(match ?? null);
        if (match) {
          const myVisibility = getSavedReviewVisibility({
            movieId: match.movie_id,
            ownerUserId: match.user_id,
            currentUserId: currentUserPk,
            reviewId: match.id,
          });
          setMyReviewVisibility(myVisibility);
          setPersonalReviewVisibility(myVisibility);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch my review:", err);
        setLocalPersonalReview(null);
      }
    };

    fetchPersonalReview();

    return () => {
      isCancelled = true;
    };
  }, [movieId, isLoggedIn, currentUserPk]);

  useEffect(() => {
    if (!movieId) return;
    if (!isLoggedIn || !currentUserPk) {
      setIsMovieWatched(false);
      return;
    }

    let isCancelled = false;

    const fetchWatchedState = async () => {
      try {
        const localWatched = getLocalWatchedMovies(currentUserPk);
        const watched = await getCurrentUserWatchedMovies(currentUserPk, {
          page: 1,
          page_size: 500,
        });
        if (isCancelled) return;
        const scopedWatched = watched.items.filter(
          (item) => !item.user_id || String(item.user_id) === String(currentUserPk)
        );
        const movieIdNumber = Number(movieId);
        setIsMovieWatched(
          scopedWatched.some((item) => Number(item.movie_id) === movieIdNumber) ||
            localWatched.some((item) => Number(item.movie_id) === movieIdNumber)
        );
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch watched movies:", err);
        const localWatched = getLocalWatchedMovies(currentUserPk);
        const movieIdNumber = Number(movieId);
        setIsMovieWatched(
          localWatched.some((item) => Number(item.movie_id) === movieIdNumber)
        );
      }
    };

    fetchWatchedState();
    return () => {
      isCancelled = true;
    };
  }, [movieId, isLoggedIn, currentUserPk]);

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!movieId) return;
      
      setLoading(true);
      setError(null);
      try {
        const movieData = await getMovie(Number(movieId));
        setMovie(movieData);
        
        const reviewsData = await getMovieReviews(Number(movieId), { page_size: 10 });
        const fetchedReviews = reviewsData.reviews;

        if (personalReview && personalReview.movie_id === movieData.id) {
          setReviews(
            fetchedReviews.filter((review) => review.id !== personalReview.id)
          );
        } else {
          setReviews(fetchedReviews);
        }

        // ML API: 사용자 취향 기반 영화 적합도 계산
        fetchMovieRecommendation(movieData);
      } catch (err) {
        setError("영화 정보를 불러오는데 실패했습니다.");
        console.error("Failed to fetch movie data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [movieId, personalReview?.id, personalReview?.movie_id, currentUserPk]);

  useEffect(() => {
    if (location.hash !== "#my-review") return;
    const target = document.getElementById("my-review");
    if (!target) return;
    const timeout = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [location.hash, movie?.id]);

  useEffect(() => {
    setReactions((prev) => {
      const next: Record<number, { likes: number; dislikes: number }> = {};
      reviews.forEach((review) => {
        const existing = prev[review.id];
        next[review.id] = {
          likes: existing?.likes ?? review.likes_count ?? 0,
          dislikes: existing?.dislikes ?? review.dislikes_count ?? 0,
        };
      });
      return next;
    });
  }, [reviews]);

  useEffect(() => {
    if (!currentUserPk) {
      setMyReviewReactions({});
      return;
    }
    const stored = getStoredReviewReactions(currentUserPk);
    setMyReviewReactions(() => {
      const next: Record<number, ReviewReaction | null> = {};
      reviews.forEach((review) => {
        const reaction = stored[String(review.id)];
        next[review.id] = reaction ?? null;
      });
      return next;
    });
  }, [reviews, currentUserPk]);

  useEffect(() => {
    const authorIds = new Set<string>();
    reviews.forEach((review) => {
      if (review.user_id) authorIds.add(review.user_id);
    });
    if (personalReview?.user_id) authorIds.add(personalReview.user_id);

    const unresolvedIds = Array.from(authorIds).filter((authorId) => {
      if (currentUserPk && authorId === currentUserPk) return false;
      return !reviewAuthorNames[authorId];
    });

    if (unresolvedIds.length === 0) return;

    let isCancelled = false;

    const fetchAuthorNames = async () => {
      const fetchedEntries = await Promise.all(
        unresolvedIds.map(async (authorId) => {
          try {
            const user = await getUser(authorId);
            const displayName =
              user.nickname?.trim() ||
              user.name?.trim() ||
              user.user_id?.trim() ||
              authorId;
            return [authorId, displayName] as const;
          } catch (err) {
            console.error(`Failed to fetch user profile: ${authorId}`, err);
            return [authorId, authorId] as const;
          }
        })
      );

      if (isCancelled) return;
      setReviewAuthorNames((prev) => ({
        ...prev,
        ...Object.fromEntries(fetchedEntries),
      }));
    };

    fetchAuthorNames();

    return () => {
      isCancelled = true;
    };
  }, [reviews, personalReview?.user_id, currentUserPk, reviewAuthorNames]);

  const handleToggleReaction = async (reviewId: number, type: ReviewReaction) => {
    if (!isLoggedIn) {
      setShowReviewLoginMessage(true);
      setReviewLoginMessageTick((prev) => prev + 1);
      return;
    }
    if (!currentUserPk) return;

    const currentReaction = myReviewReactions[reviewId] ?? null;
    if (currentReaction && currentReaction !== type) {
      return;
    }

    try {
      const response = await toggleReviewLike(reviewId, currentUserPk, type === "like");
      const nextReaction = currentReaction === type ? null : type;
      setReactions((prev) => ({
        ...prev,
        [reviewId]: {
          likes: response.likes_count,
          dislikes: response.dislikes_count,
        },
      }));
      setMyReviewReactions((prev) => ({
        ...prev,
        [reviewId]: nextReaction,
      }));

      const stored = getStoredReviewReactions(currentUserPk);
      if (nextReaction) {
        stored[String(reviewId)] = nextReaction;
      } else {
        delete stored[String(reviewId)];
      }
      setStoredReviewReactions(currentUserPk, stored);
    } catch (err) {
      console.error("Failed to toggle review reaction:", err);
    }
  };

  const applySavedPersonalReview = (nextReview: Review) => {
    setLocalPersonalReview(nextReview);
    setPersonalReviewVisibility(myReviewVisibility);
    setIsPersonalReviewDeleted(false);
    setIsEditingMyReview(false);
    setShowReviewLoginMessage(false);
    setMyReviewOpen(false);
    setHoverReviewRating(null);
    setIsVisibilityOpen(false);
    setMyReviewErrorMessage(null);
  };

  const handleMyReviewSave = async () => {
    if (!movie || isSavingMyReview) return;
    if (!isLoggedIn) {
      setShowReviewLoginMessage(true);
      setReviewLoginMessageTick((prev) => prev + 1);
      return;
    }

    const userId = localStorage.getItem("mw_user_pk");
    if (!userId) {
      setMyReviewErrorMessage(
        "세션 정보가 오래되었습니다. 로그아웃 후 다시 로그인해주세요."
      );
      return;
    }

    const content = myReviewContent.trim().slice(0, REVIEW_CONTENT_MAX_LENGTH);
    const reviewPayload = {
      rating: normalizeReviewRating(myReviewRating),
      content: content.length ? content : null,
    };

    setIsSavingMyReview(true);
    setMyReviewErrorMessage(null);

    try {
      let nextReview: Review;
      if (personalReview?.id) {
        nextReview = await updateReview(personalReview.id, reviewPayload);
      } else {
        nextReview = await createReview(userId, {
          movie_id: movie.id,
          ...reviewPayload,
        });
      }

      saveReviewVisibility({
        movieId: movie.id,
        ownerUserId: userId,
        reviewId: nextReview.id,
        visibility: myReviewVisibility,
      });
      applySavedPersonalReview(nextReview);
    } catch (err) {
      const message = err instanceof Error ? err.message : "리뷰 저장에 실패했습니다.";

        if (
        !personalReview?.id &&
        typeof message === "string" &&
        message.toLowerCase().includes("already reviewed")
      ) {
        try {
          const myReviews = await getCurrentUserReviews(userId, {
            page: 1,
            page_size: 100,
          });
          const scopedReviews = myReviews.reviews.filter(
            (item) => String(item.user_id) === String(userId)
          );
          const existingReview = scopedReviews.find(
            (item) => item.movie_id === movie.id
          );
          if (existingReview) {
            const updatedReview = await updateReview(existingReview.id, reviewPayload);
            saveReviewVisibility({
              movieId: movie.id,
              ownerUserId: userId,
              reviewId: updatedReview.id,
              visibility: myReviewVisibility,
            });
            applySavedPersonalReview(updatedReview);
            return;
          }
        } catch (fallbackErr) {
          console.error("Failed to recover already-reviewed state:", fallbackErr);
        }
      }

      console.error("Failed to save review:", err);
      setMyReviewErrorMessage(message);
    } finally {
      setIsSavingMyReview(false);
    }
  };

  const handleMyReviewEditOpen = () => {
    if (!personalReview) return;
    setMyReviewRating(normalizeReviewRating(personalReview.rating ?? 5));
    setMyReviewContent(
      (personalReview.content ?? "").slice(0, REVIEW_CONTENT_MAX_LENGTH)
    );
    setMyReviewVisibility(personalReviewVisibility);
    setIsEditingMyReview(true);
    setShowReviewLoginMessage(false);
    setMyReviewErrorMessage(null);
    setMyReviewOpen(true);
    setHoverReviewRating(null);
    setIsVisibilityOpen(false);
  };

  const handleMyReviewDeleteConfirm = async () => {
    if (!movie || !personalReview || isDeletingMyReview) return;
    setIsDeletingMyReview(true);
    setMyReviewErrorMessage(null);

    try {
      await deleteReview(personalReview.id);
      removeSavedReviewVisibility({
        movieId: movie.id,
        ownerUserId: personalReview.user_id,
        reviewId: personalReview.id,
      });
      removeLegacyStoredVisibility(movie.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "리뷰 삭제에 실패했습니다.";
      console.error("Failed to delete review:", err);
      setMyReviewErrorMessage(message);
      setIsDeletingMyReview(false);
      return;
    }

    setLocalPersonalReview(null);
    setIsPersonalReviewDeleted(true);
    setIsEditingMyReview(false);
    setMyReviewOpen(false);
    setHoverReviewRating(null);
    setShowReviewLoginMessage(false);
    setMyReviewVisibility("public");
    setPersonalReviewVisibility("public");
    setIsVisibilityOpen(false);
    setReviewDeleteConfirmOpen(false);
    setIsDeletingMyReview(false);
  };

  const handleMarkWatched = async () => {
    if (!movie) return;
    if (!isLoggedIn) {
      setShowReviewLoginMessage(true);
      setReviewLoginMessageTick((prev) => prev + 1);
      return;
    }
    if (!currentUserPk) return;

    try {
      await saveCurrentUserWatchedMovie(currentUserPk, { movie_id: movie.id });
    } catch (err) {
      console.error("Failed to save watched movie:", err);
    } finally {
      upsertLocalWatchedMovie(currentUserPk, {
        movie_id: movie.id,
        title: movie.title,
        poster_url: movie.poster_url,
        genres: movie.genres,
      });
      setIsMovieWatched(true);
    }
  };

  const resolveRatingFromPointer = (
    event: ReactMouseEvent<HTMLSpanElement>,
    starNumber: number
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const isLeftHalf = pointerX < rect.width / 2;
    const nextValue = starNumber - (isLeftHalf ? 0.5 : 0);
    return normalizeReviewRating(nextValue);
  };

  const handleReviewRatingHover = (
    event: ReactMouseEvent<HTMLSpanElement>,
    starNumber: number
  ) => {
    if (!isLoggedIn) return;
    setHoverReviewRating(resolveRatingFromPointer(event, starNumber));
  };

  const handleReviewRatingSelect = (
    event: ReactMouseEvent<HTMLSpanElement>,
    starNumber: number
  ) => {
    if (!isLoggedIn) return;
    const nextRating = resolveRatingFromPointer(event, starNumber);
    setMyReviewRating(nextRating);
    setHoverReviewRating(nextRating);
  };

  const handleReviewRatingKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isLoggedIn) return;

    let nextRating = myReviewRating;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        nextRating = normalizeReviewRating(myReviewRating + 0.5);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        nextRating = normalizeReviewRating(myReviewRating - 0.5);
        break;
      case "Home":
        nextRating = 0.5;
        break;
      case "End":
        nextRating = 5;
        break;
      default:
        return;
    }

    event.preventDefault();
    setMyReviewRating(nextRating);
    setHoverReviewRating(null);
  };
  const toggleReplyOpen = (reviewId: number) => {
    setReplyOpen((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const loadReviewComments = async (reviewId: number) => {
    setCommentLoading((prev) => ({ ...prev, [reviewId]: true }));
    setCommentErrors((prev) => ({ ...prev, [reviewId]: null }));
    const localComments = getLocalReviewComments(reviewId);
    try {
      const apiComments = await getReviewComments(reviewId);
      const merged = mergeReviewComments(apiComments, localComments);
      setReviewComments((prev) => ({ ...prev, [reviewId]: merged }));
      if (localComments.length > 0) {
        saveLocalReviewComments(reviewId, localComments);
      }
    } catch (err) {
      console.error("Failed to fetch review comments:", err);
      setReviewComments((prev) => ({
        ...prev,
        [reviewId]: mergeReviewComments(localComments, prev[reviewId] || []),
      }));
      setCommentErrors((prev) => ({
        ...prev,
        [reviewId]: "댓글을 불러오지 못했습니다.",
      }));
    } finally {
      setCommentLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const toggleCommentOpen = (reviewId: number) => {
    setCommentOpen((prev) => {
      const nextOpen = !prev[reviewId];
      if (nextOpen) {
        void loadReviewComments(reviewId);
      }
      return { ...prev, [reviewId]: nextOpen };
    });
  };

  const handleReplyChange = (reviewId: number, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [reviewId]: value,
    }));
  };

  const handleReplySubmit = async (reviewId: number) => {
    const nextValue = (replyDrafts[reviewId] || "").trim();
    if (!nextValue) return;
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
    setReplyOpen((prev) => ({ ...prev, [reviewId]: false }));

    let createdComment: ReviewComment | null = null;
    if (currentUserPk) {
      try {
        createdComment = await createReviewComment(reviewId, currentUserPk, {
          content: nextValue,
        });
      } catch (err) {
        console.error("Failed to save comment to API:", err);
      }
    }

    if (!createdComment) {
      const fallbackUserId = currentUserPk || "guest";
      createdComment = createLocalReviewComment(
        reviewId,
        fallbackUserId,
        nextValue
      );
      const localComments = getLocalReviewComments(reviewId);
      const nextLocal = mergeReviewComments([createdComment], localComments);
      saveLocalReviewComments(reviewId, nextLocal);
    }

    if (!createdComment) return;

    setReviewComments((prev) => ({
      ...prev,
      [reviewId]: mergeReviewComments(
        [createdComment],
        prev[reviewId] || getLocalReviewComments(reviewId)
      ),
    }));
    setCommentOpen((prev) => ({ ...prev, [reviewId]: true }));
  };

  const personalReviewVisibilityMeta = getReviewVisibilityMeta(
    personalReviewVisibility
  );

  const fetchMovieRecommendation = async (movieData: Movie) => {
    setMlLoading(true);
    try {
      // 공통 유틸리티 함수 사용
      const result = await calculateMovieMatchRate(movieData);
      
      if (!result) {
        // 취향 정보가 없으면 ML API 호출 안 함
        return;
      }

      setPrediction(result);

      // 설명 생성
      const explanationResult = await explainPrediction({
        movie_title: movieData.title,
        match_rate: result.match_rate,
        probability: result.probability,
        breakdown: result.breakdown,
        user_liked_tags: [], // calculateMovieMatchRate에서 이미 계산됨
        user_disliked_tags: [],
      });
      setExplanation(explanationResult);
    } catch (err) {
      console.error('Failed to fetch ML recommendation:', err);
      // ML API 실패는 치명적이지 않으므로 에러 표시 안 함
    } finally {
      setMlLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <main className="container movie-detail-page">
          <p>로딩 중...</p>
        </main>
      </MainLayout>
    );
  }

  if (error || !movie) {
    return (
      <MainLayout>
        <main className="container movie-detail-page">
          <p className="error">{error || "영화를 찾을 수 없습니다."}</p>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="container movie-detail-page">
        <section className="page-title">
          <h1>영화 상세</h1>
          <p>영화를 선택하면 상세 정보와 취향 적합도를 확인할 수 있어요.</p>
        </section>

        <section className="section">
          <article className="card movie-detail-main-card">
            <div className="movie-detail-card-actions">
              <button
                className={`secondary-btn movie-watch-btn ${
                  isMovieWatched ? "is-active" : ""
                }`}
                type="button"
                onClick={handleMarkWatched}
              >
                시청함
              </button>
            </div>
            <div className="movie-tile">
              <img
                className="poster"
                src={
                  movie.poster_url ||
                  "https://via.placeholder.com/500x750?text=No+Image"
                }
                alt={`${movie.title} 포스터`}
              />
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <p className="muted">
                  {movie.release
                    ? new Date(movie.release).getFullYear()
                    : "미정"}{" "}
                  · {movie.genres.slice(0, 2).join("/")} ·{" "}
                  {movie.runtime ? `${movie.runtime}분` : "정보 없음"}
                </p>
                <div className="tag-list" style={{ marginTop: 10 }}>
                  {movie.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="section" style={{ marginTop: 18 }}>
              <h3>시놉시스</h3>
              <p className="muted">
                {movie.synopsis || "줄거리 정보가 없습니다."}
              </p>
            </div>

            <div className="section" style={{ marginTop: 18 }}>
              <h3>나와의 적합도</h3>
              {mlLoading ? (
                <p className="muted">분석 중...</p>
              ) : prediction && explanation ? (
                <>
                  <p className="probability">적합 확률 {Math.round(prediction.match_rate)}%</p>
                  <p className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
                    {explanation.explanation}
                  </p>
                  <ul className="list">
                    {explanation.key_factors.slice(0, 3).map((factor, idx) => (
                      <li key={idx}>
                        {factor.label}: {Math.round(factor.score * 100)}% 일치
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="probability">적합 확률 83%</p>
                  <ul className="list">
                    <li>거대한 세계관과 몰입도 높은 전개를 선호하셨어요.</li>
                    <li>가족 서사가 중심인 작품을 좋아하셨어요.</li>
                    <li>유사 취향 사용자 반응이 긍정적이었어요.</li>
                  </ul>
                </>
              )}
            </div>

            {prediction && prediction.breakdown.dislike_penalty > 0 && (
              <div className="section" style={{ marginTop: 18 }}>
                <h3>주의할 점</h3>
                <p className="muted">
                  선호하지 않는 요소가 일부 포함되어 있을 수 있습니다.
                </p>
              </div>
            )}

            {/* <div className="hero-actions" style={{ marginTop: 18 }}>
              <button className="primary-btn">바로 감상하기</button>
            </div> */}
          </article>
        </section>

        <section className="section" id="my-review">
          <div className="section-header">
            <h2>내 리뷰</h2>
          </div>
          {personalReview && personalReview.movie_id === movie.id && !myReviewOpen ? (
            <article className="card review-card">
              <div className="review-header">
                <div className="review-user">
                  <div className="review-avatar">
                    {getDisplayAuthorName(personalReview.user_id).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="review-name">{getDisplayAuthorName(personalReview.user_id)}</p>
                    <p className="muted review-meta-line">
                      <span>
                        {personalReviewDate} · 평점{" "}
                        {formatRatingLabel(personalReview.rating)}
                      </span>
                      <span
                        className={`review-visibility-indicator ${personalReviewVisibilityMeta.className}`}
                        role="img"
                        aria-label={personalReviewVisibilityMeta.label}
                        title={personalReviewVisibilityMeta.label}
                      />
                    </p>
                  </div>
                </div>
              </div>
              <p className="review-text">
                {personalReview.content || "리뷰 코멘트가 없습니다."}
              </p>
              <div className="review-link-row">
                <button
                  className="ghost-btn review-link-btn"
                  type="button"
                  onClick={handleMyReviewEditOpen}
                >
                  리뷰 수정
                </button>
                <button
                  className="ghost-btn review-link-btn"
                  type="button"
                  onClick={() => setReviewDeleteConfirmOpen(true)}
                >
                  리뷰 삭제
                </button>
              </div>
            </article>
          ) : (
            <article className="card review-card review-empty review-empty-stack">
              {myReviewOpen ? (
                <div className="review-form form-grid">
                  <div className="review-form-row review-form-row-full">
                    <label htmlFor="my-review-content">리뷰</label>
                    <textarea
                      id="my-review-content"
                      className="review-reply-input"
                      placeholder={isLoggedIn ? "리뷰를 입력하세요" : ""}
                      value={myReviewContent}
                      maxLength={REVIEW_CONTENT_MAX_LENGTH}
                      readOnly={!isLoggedIn}
                      onChange={(event) =>
                        setMyReviewContent(
                          event.target.value.slice(0, REVIEW_CONTENT_MAX_LENGTH)
                        )
                      }
                    />
                    <p className="review-char-count" aria-live="polite">
                      {myReviewContent.length} / {REVIEW_CONTENT_MAX_LENGTH}
                    </p>
                    {!isLoggedIn && showReviewLoginMessage && (
                      <p className="error" key={`review-login-warning-${reviewLoginMessageTick}`}>
                        로그인 후 이용해주세요.
                      </p>
                    )}
                    {myReviewErrorMessage && (
                      <p className="error" role="alert">
                        {myReviewErrorMessage}
                      </p>
                    )}
                  </div>
                  <div className="review-form-row review-form-row-full review-rating-actions-row">
                    <div className="review-rating-block">
                      <label>별점</label>
                      <div className="review-rating-input-wrap">
                        <div
                          id="my-review-rating"
                          className={`review-rating-input ${!isLoggedIn ? "is-disabled" : ""}`}
                          role="slider"
                          aria-label="별점"
                          aria-valuemin={0.5}
                          aria-valuemax={5}
                          aria-valuenow={previewReviewRating}
                          aria-valuetext={`${formatRatingLabel(previewReviewRating)}점`}
                          aria-disabled={!isLoggedIn}
                          tabIndex={isLoggedIn ? 0 : -1}
                          onKeyDown={handleReviewRatingKeyDown}
                          onMouseLeave={() => setHoverReviewRating(null)}
                        >
                          {Array.from({ length: 5 }, (_, index) => {
                            const starNumber = index + 1;
                            const fillPercent = getStarFillPercent(previewReviewRating, starNumber);

                            return (
                              <span
                                key={starNumber}
                                className={`review-rating-star-hitbox ${
                                  !isLoggedIn ? "is-disabled" : ""
                                }`}
                                aria-label={`${starNumber}점`}
                                onMouseMove={(event) => handleReviewRatingHover(event, starNumber)}
                                onClick={(event) => handleReviewRatingSelect(event, starNumber)}
                              >
                                <span className="review-rating-star-image review-rating-star-empty" aria-hidden="true" />
                                <span
                                  className="review-rating-star-fill-wrap"
                                  aria-hidden="true"
                                  style={{ width: `${fillPercent}%` }}
                                >
                                  <span className="review-rating-star-image review-rating-star-filled" />
                                </span>
                              </span>
                            );
                          })}
                        </div>
                        <span className="review-rating-current">
                          {formatRatingLabel(previewReviewRating)}점
                        </span>
                      </div>
                    </div>
                    <div className="review-reply-actions review-form-actions">
                      <div
                        className="group-select-wrap option-select review-visibility-wrap"
                        ref={visibilitySelectRef}
                      >
                        <button
                          type="button"
                          className="option-select-trigger"
                          aria-haspopup="listbox"
                          aria-expanded={isVisibilityOpen}
                          aria-controls="review-visibility-options"
                          disabled={!isLoggedIn}
                          onClick={() => setIsVisibilityOpen((prev) => !prev)}
                        >
                          <span>
                            {myReviewVisibility === "private" ? "비공개" : "공개"}
                          </span>
                          <span className="option-select-arrow" aria-hidden="true">
                            ▾
                          </span>
                        </button>
                        {isVisibilityOpen && isLoggedIn && (
                          <div
                            id="review-visibility-options"
                            className="search-results option-select-list"
                            role="listbox"
                          >
                            <button
                              type="button"
                              className="search-item option-select-item"
                              role="option"
                              aria-selected={myReviewVisibility === "public"}
                              onClick={() => {
                                setMyReviewVisibility("public");
                                setIsVisibilityOpen(false);
                              }}
                            >
                              <strong>공개</strong>
                              {myReviewVisibility === "public" && <span>✓</span>}
                            </button>
                            <button
                              type="button"
                              className="search-item option-select-item"
                              role="option"
                              aria-selected={myReviewVisibility === "private"}
                              onClick={() => {
                                setMyReviewVisibility("private");
                                setIsVisibilityOpen(false);
                              }}
                            >
                              <strong>비공개</strong>
                              {myReviewVisibility === "private" && <span>✓</span>}
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        className="primary-btn review-reply-submit"
                        type="button"
                        disabled={isSavingMyReview}
                        onClick={handleMyReviewSave}
                      >
                        {isSavingMyReview
                          ? isEditingMyReview
                            ? "수정 중..."
                            : "저장 중..."
                          : isEditingMyReview
                          ? "수정하기"
                          : "저장하기"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="review-empty-row">
                  <p className="muted">아직 이 영화에는 리뷰가 없어요.</p>
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => {
                      setIsEditingMyReview(false);
                      setMyReviewRating(normalizeReviewRating(5));
                      setMyReviewContent("");
                      setMyReviewVisibility("public");
                      setMyReviewErrorMessage(null);
                      setMyReviewOpen(true);
                      setHoverReviewRating(null);
                      setIsVisibilityOpen(false);
                      setShowReviewLoginMessage(false);
                    }}
                  >
                    리뷰 남기기
                  </button>
                </div>
              )}
            </article>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <h2>다른 사람들의 리뷰</h2>
            <p>이 영화에 대한 다양한 반응</p>
          </div>
          {reviews.length === 0 ? (
            <article className="card review-card review-empty">
              <p className="muted">아직 이 영화에는 리뷰가 없어요.</p>
            </article>
          ) : (
            <div className="review-list">
              {reviews.map((review) => {
                const authorName = getDisplayAuthorName(review.user_id);
                const reviewVisibility = getSavedReviewVisibility({
                  movieId: review.movie_id,
                  ownerUserId: review.user_id,
                  currentUserId: currentUserPk,
                  reviewId: review.id,
                });
                const visibilityMeta = getReviewVisibilityMeta(reviewVisibility);
                const isPrivateForViewer =
                  reviewVisibility === "private" &&
                  !(currentUserPk && review.user_id === currentUserPk);
                const reviewContent = isPrivateForViewer
                  ? "이 리뷰는 비공개 리뷰입니다."
                  : review.content ?? "리뷰 코멘트가 없습니다.";
                return (
                  <article className="card review-card" key={review.id}>
                    <div className="review-header">
                      <div className="review-user">
                        <div className="review-avatar">
                          {authorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="review-name">{authorName}</p>
                          <p className="muted review-meta-line">
                            <span>
                              {formatDateTime(review.created_at)} · 평점{" "}
                              {formatRatingLabel(review.rating)}
                            </span>
                            {reviewVisibility === "private" && (
                              <span
                                className={`review-visibility-indicator ${visibilityMeta.className}`}
                                role="img"
                                aria-label={visibilityMeta.label}
                                title={visibilityMeta.label}
                              />
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="review-actions">
                        {(() => {
                          const reaction = myReviewReactions[review.id] ?? null;
                          const likeActive = reaction === "like";
                          const dislikeActive = reaction === "dislike";
                          return (
                            <>
                              <button
                                className={`ghost-btn review-reaction-btn ${
                                  likeActive ? "is-active" : ""
                                }`}
                                type="button"
                                aria-pressed={likeActive}
                                disabled={dislikeActive}
                                onClick={() => handleToggleReaction(review.id, "like")}
                              >
                                <span
                                  className="review-reaction-icon"
                                  aria-hidden="true"
                                />
                                좋아요 {reactions[review.id]?.likes ?? review.likes_count ?? 0}
                              </button>
                              {/* <span className="muted">|</span> */}
                              <button
                                className={`ghost-btn review-reaction-btn ${
                                  dislikeActive ? "is-active" : ""
                                }`}
                                type="button"
                                aria-pressed={dislikeActive}
                                disabled={likeActive}
                                onClick={() => handleToggleReaction(review.id, "dislike")}
                              >
                                <span
                                  className="review-reaction-icon is-dislike"
                                  aria-hidden="true"
                                />
                                싫어요{" "}
                                {reactions[review.id]?.dislikes ?? review.dislikes_count ?? 0}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <p className="review-text">
                      {isPrivateForViewer
                        ? reviewContent
                        : reviewContent.length > 100
                          ? reviewContent.substring(0, 100) + "..."
                          : reviewContent}
                    </p>
                    <div className="review-link-row">
                      <button
                        className="ghost-btn review-link-btn"
                        type="button"
                        onClick={() => toggleReplyOpen(review.id)}
                      >
                        댓글 달기
                      </button>
                      <button
                        className="ghost-btn review-link-btn"
                        type="button"
                        onClick={() => toggleCommentOpen(review.id)}
                      >
                        댓글 보기
                      </button>
                    </div>
                    {replyOpen[review.id] && (
                      <div className="review-reply-form">
                        <textarea
                          className="review-reply-input"
                          placeholder="댓글을 입력하세요"
                          value={replyDrafts[review.id] || ""}
                          onChange={(event) =>
                            handleReplyChange(review.id, event.target.value)
                          }
                        />
                        <div className="review-reply-actions">
                          <button
                            className="primary-btn review-reply-submit"
                            type="button"
                            onClick={() => handleReplySubmit(review.id)}
                          >
                            저장하기
                          </button>
                        </div>
                      </div>
                    )}
                    {commentOpen[review.id] && (
                      <div className="comment-list">
                        {commentLoading[review.id] ? (
                          <p className="muted">댓글을 불러오는 중...</p>
                        ) : (reviewComments[review.id] || []).length > 0 ? (
                          (reviewComments[review.id] || []).map((comment) => (
                            <div className="comment-card" key={comment.id}>
                              <div className="comment-meta">
                                <span className="review-name">
                                  {getDisplayAuthorName(comment.user_id)}
                                </span>
                                <span className="muted">
                                  {formatDateTime(comment.created_at)}
                                </span>
                              </div>
                              <p className="review-text">{comment.content}</p>
                            </div>
                          ))
                        ) : (
                          <p className="muted">아직 댓글이 없습니다.</p>
                        )}
                        {commentErrors[review.id] && (
                          <p className="muted">{commentErrors[review.id]}</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {reviewDeleteConfirmOpen && (
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-delete-title"
          >
            <div
              className="modal-overlay"
              onClick={() => setReviewDeleteConfirmOpen(false)}
            />
            <div className="modal-content review-delete-modal">
              <div className="modal-header">
                <h3 id="review-delete-title">리뷰 삭제</h3>
              </div>
              <p className="muted">삭제하시겠습니까?</p>
              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setReviewDeleteConfirmOpen(false)}
                >
                  아니오
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  disabled={isDeletingMyReview}
                  onClick={handleMyReviewDeleteConfirm}
                >
                  {isDeletingMyReview ? "삭제 중..." : "예"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}










