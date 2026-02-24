import { useMemo } from "react";
import { getArrayFromStorage, getStringFromStorage } from "../utils/storage";

type TasteSurveyStorage = {
  selectedGenres: string[];
  avoidedGenres: string[];
  savedKeywords: string[];
  savedVibe: string;
  tasteContext: string;
  tasteOrigin: string;
  hasSurveyData: boolean;
};

export const useTasteSurveyStorage = (refreshKey?: number): TasteSurveyStorage =>
  useMemo(() => {
    const selectedGenres = getArrayFromStorage("mw_taste_genres");
    const avoidedGenres = getArrayFromStorage("mw_taste_avoid_genres");
    const savedKeywords = getArrayFromStorage("mw_taste_keywords");
    const savedVibe = getStringFromStorage("mw_taste_vibe").trim();
    const tasteContext = getStringFromStorage("mw_taste_context").trim();
    const tasteOrigin = getStringFromStorage("mw_taste_origin").trim();
    const hasSurveyData =
      selectedGenres.length > 0 ||
      avoidedGenres.length > 0 ||
      savedKeywords.length > 0 ||
      Boolean(savedVibe) ||
      Boolean(tasteContext) ||
      Boolean(tasteOrigin);

    return {
      selectedGenres,
      avoidedGenres,
      savedKeywords,
      savedVibe,
      tasteContext,
      tasteOrigin,
      hasSurveyData,
    };
  }, [refreshKey]);
