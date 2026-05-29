-- In-app updates moved to GitHub Releases; the backend no longer stores or
-- serves APKs, so the app_releases table is removed.
DROP TABLE IF EXISTS "app_releases";
