

# Activate Remaining Missing Folder Features

## Overview

Four features deferred from v1 of the Coach Activity Folders System, now fully implemented.

---

## Feature 1: Overload Warnings When Folder + Hammers Exceed Thresholds ✅

- Extended `detect-overlaps` edge function with `folder_cns_load` param and `folder_overload` warning type
- Created `useFolderOverloadCheck` hook with CNS estimation by item type
- Created `FolderOverloadBanner` component for Game Plan integration

## Feature 2: Coach Editing Player-Created Folders (Permission Model) ✅

- Added `coach_edit_allowed` and `coach_edit_user_id` columns to `activity_folders`
- Created `folder_allows_coach_edit` security definer function
- RLS policies for coach UPDATE/INSERT/DELETE on folders and items
- Coach edit toggle in `FolderDetailDialog` for player-owned folders

## Feature 3: Folder Template Library (Coach-to-Coach Sharing) ✅

- Added `is_template`, `template_category`, `template_description`, `use_count`, `source_template_id` columns
- RLS policy for public template visibility
- Created `useFolderTemplates` hook (fetch, duplicate, publish, unpublish)
- Created `FolderTemplateLibrary` component with category filter
- "Publish as Template" option in `FolderCard` dropdown
- Publish dialog in `FolderTabContent`

## Feature 4: Date-Based Scheduling ✅

- Added `specific_dates` (date[]) column to `activity_folder_items`
- Added `specific_dates` to `ActivityFolderItem` type
- Schedule Type toggle in `FolderItemEditor` (Weekly Pattern vs Specific Dates)
- Multi-date calendar picker with visual date chips
- Specific dates display in `FolderDetailDialog`
