# Music Desktop Layout Design

## Goal

Recompose the desktop music visualizer around a left playback column and a right lyrics column. Keep the existing mobile layout unchanged.

## Confirmed Layout

- Desktop left column: vinyl record, playback controls, and playlist access.
- Desktop right column: synchronized lyrics only, without the lyric guide line or markers.
- A thin vertical divider separates the columns.
- The current track name is vertically set on the upper left side of the divider.
- The current track artist is vertically set on the lower right side of the divider.
- Track metadata is removed from the center of the vinyl record.
- Existing playback controls, seek control, volume, playlist switching, lyric synchronization, and 3D background remain available.
- The existing mobile breakpoint continues to use the compact layout unchanged.

## Data Flow

`VisualizerControls.svelte` already receives `track.name` and `track.artist` from the music manager. The desktop divider metadata reads those same values, so no music configuration or manager API changes are needed.

## Implementation

1. Reorganize the desktop visualizer shell into named record, divider-metadata, and lyrics regions.
2. Render the track metadata once in the divider region and remove the duplicated desktop record metadata.
3. Remove only the lyrics panel guide line and markers; keep active-line scrolling and KTV highlighting.
4. Add desktop-only CSS grid placement and a reduced-motion fallback. Keep all mobile selectors and markup behavior intact.

## Verification

- Add a component-level regression test for the desktop metadata placement and absent lyric timeline.
- Run the focused test before implementation to prove it fails, then after implementation to prove it passes.
- Run `pnpm check` and inspect desktop and mobile browser screenshots at representative viewports.
