#!/usr/bin/env python3
"""Validate and prepare a RADAR student CSV without persisting source files."""

from __future__ import annotations

import io
import json
import math
import re
import sys

import numpy as np
import pandas as pd

REQUIRED_COLUMNS = ("student_number", "first_name", "last_name")
STRING_LIMITS = {
    "student_number": 50,
    "first_name": 100,
    "last_name": 100,
    "email": 255,
    "faculty": 150,
    "programme": 150,
    "semester": 30,
}
INTEGER_RULES = {
    "age": (0, 130),
    "academic_year": (1900, 2200),
    "total_classes": (0, 2_147_483_647),
    "attended_classes": (0, 2_147_483_647),
    "weekly_logins": (0, 2_147_483_647),
    "resource_downloads": (0, 2_147_483_647),
    "discussion_participation": (0, 2_147_483_647),
    "session_duration": (0, 2_147_483_647),
}
DECIMAL_RULES = {
    "gpa": (0, 99.99),
    "assignment_average": (0, 100),
    "test_average": (0, 100),
    "attendance_percentage": (0, 100),
    "assignment_submission_rate": (0, 100),
}
TEXT_COLUMNS = tuple(STRING_LIMITS)
OPTIONAL_COLUMNS = (
    "email",
    "age",
    "faculty",
    "programme",
    "academic_year",
    "semester",
    "gpa",
    "assignment_average",
    "test_average",
    "attendance_percentage",
    "total_classes",
    "attended_classes",
    "weekly_logins",
    "assignment_submission_rate",
    "resource_downloads",
    "discussion_participation",
    "session_duration",
)
ALLOWED_COLUMNS = set(REQUIRED_COLUMNS) | set(OPTIONAL_COLUMNS)
FEATURE_COLUMNS = (
    "gpa",
    "assignment_average",
    "test_average",
    "attendance_percentage",
    "total_classes",
    "attended_classes",
    "weekly_logins",
    "assignment_submission_rate",
    "resource_downloads",
    "discussion_participation",
    "session_duration",
)
MISSING_MARKERS = {"", "na", "n/a", "null", "none", "nan"}
MAX_ROWS = 5_000
MAX_COLUMNS = 40
MAX_ISSUES = 200


def emit(payload: dict) -> None:
    sys.stdout.write(
        json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    )
    sys.stdout.write("\n")


def failure(
    message: str,
    rows_received: int = 0,
    issues: list[dict] | None = None,
    duplicate_rows_removed: int = 0,
    missing_values: list[dict] | None = None,
) -> None:
    emit(
        {
            "ok": False,
            "error": message,
            "rowsReceived": rows_received,
            "duplicateRowsRemoved": duplicate_rows_removed,
            "missingValues": missing_values or [],
            "issues": issues or [],
        }
    )


def normalize_header(value: object) -> str:
    header = str(value).replace("\ufeff", "").strip().lower()
    return re.sub(r"[\s-]+", "_", header)


def get_cell(row: pd.Series, column: str) -> str | None:
    if column not in row.index:
        return None
    value = row[column]
    if pd.isna(value):
        return None
    text = str(value).strip()
    if text.lower() in MISSING_MARKERS:
        return None
    return text


def to_number(
    value: str | None,
    row_number: int,
    column: str,
    issues: list[dict],
    integer: bool = False,
    minimum: float = 0,
    maximum: float = math.inf,
) -> int | float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        if len(issues) < MAX_ISSUES:
            issues.append(
                {
                    "row": row_number,
                    "column": column,
                    "message": "Enter a valid number or leave this optional value blank.",
                }
            )
        return None
    if not math.isfinite(number):
        message = "Value must be a finite number."
    elif integer and not number.is_integer():
        message = "Enter a whole number."
    elif number < minimum or number > maximum:
        message = f"Value must be between {minimum:g} and {maximum:g}."
    else:
        return int(number) if integer else round(number, 2)

    if len(issues) < MAX_ISSUES:
        issues.append({"row": row_number, "column": column, "message": message})
    return None


def missing_counts(records: list[dict]) -> list[dict]:
    counts: list[dict] = []
    columns = REQUIRED_COLUMNS + OPTIONAL_COLUMNS
    for column in columns:
        count = sum(record.get(column) is None for record in records)
        if count:
            counts.append({"column": column, "count": int(count)})
    return counts


def prepare_features(records: list[dict]) -> tuple[list[str], int, list[dict]]:
    if not records:
        return [], 0, []

    frame = pd.DataFrame(
        [{column: record.get(column) for column in FEATURE_COLUMNS} for record in records]
    )
    for column in FEATURE_COLUMNS:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    available = [column for column in FEATURE_COLUMNS if frame[column].notna().any()]
    if not available:
        return [], 0, []

    imputed_features: list[dict] = []
    medians: dict[str, float] = {}
    for column in available:
        missing_count = int(frame[column].isna().sum())
        median = frame[column].median(skipna=True)
        imputation_value = 0.0 if pd.isna(median) else float(median)
        medians[column] = imputation_value
        if missing_count:
            imputed_features.append(
                {
                    "column": column,
                    "missingCount": missing_count,
                    "imputationValue": round(imputation_value, 4),
                }
            )

    matrix = frame[available].fillna(medians).to_numpy(dtype=np.float64)
    means = np.mean(matrix, axis=0)
    standard_deviations = np.std(matrix, axis=0)
    standard_deviations = np.where(standard_deviations == 0, 1.0, standard_deviations)
    standardized = (matrix - means) / standard_deviations
    if not np.isfinite(standardized).all():
        raise ValueError("Feature preparation produced a non-finite value.")

    # The prepared matrix is intentionally kept in memory. Validated source
    # values, including missing values as null, are what get persisted.
    return available, len(records), imputed_features


def main() -> None:
    csv_text = sys.stdin.read()
    if not csv_text.strip():
        failure("The CSV file is empty.", issues=[{"row": 1, "column": "_file", "message": "Upload a CSV containing a header and at least one data row."}])
        return

    try:
        frame = pd.read_csv(
            io.StringIO(csv_text),
            dtype=str,
            keep_default_na=False,
            na_values=[""],
        )
    except (pd.errors.EmptyDataError, pd.errors.ParserError, UnicodeError):
        failure("The file could not be read as a valid CSV.", issues=[{"row": 1, "column": "_file", "message": "Check the CSV encoding, delimiter, and quotes."}])
        return

    frame.columns = [normalize_header(column) for column in frame.columns]
    rows_received = len(frame.index)

    if len(frame.columns) > MAX_COLUMNS:
        failure(
            f"The CSV can contain no more than {MAX_COLUMNS} columns.",
            rows_received,
            [{"row": 1, "column": "_file", "message": "Remove unsupported columns and try again."}],
        )
        return
    if rows_received > MAX_ROWS:
        failure(
            f"The CSV can contain no more than {MAX_ROWS} data rows per import.",
            rows_received,
            [{"row": 1, "column": "_file", "message": "Split the dataset into smaller CSV files."}],
        )
        return

    header_issues: list[dict] = []
    duplicated_headers = frame.columns[frame.columns.duplicated()].tolist()
    for header in sorted(set(duplicated_headers)):
        header_issues.append(
            {"row": 1, "column": header, "message": "This column appears more than once."}
        )
    for column in REQUIRED_COLUMNS:
        if column not in frame.columns:
            header_issues.append(
                {"row": 1, "column": column, "message": "Required column is missing."}
            )
    for column in frame.columns:
        if column not in ALLOWED_COLUMNS:
            header_issues.append(
                {"row": 1, "column": column, "message": "Unrecognized column; use the RADAR CSV template."}
            )
    if header_issues:
        failure(
            "The CSV headers do not match the RADAR import template. No records were saved.",
            rows_received,
            header_issues[:MAX_ISSUES],
        )
        return
    if rows_received == 0:
        failure(
            "The CSV has a header but no student rows.",
            issues=[{"row": 2, "column": "_file", "message": "Add at least one student row."}],
        )
        return

    issues: list[dict] = []
    raw_records: list[dict] = []
    for index, row in frame.iterrows():
        row_number = int(index) + 2
        record: dict = {}

        for column in REQUIRED_COLUMNS + OPTIONAL_COLUMNS:
            record[column] = get_cell(row, column)

        for column in REQUIRED_COLUMNS:
            value = record[column]
            if value is None:
                if len(issues) < MAX_ISSUES:
                    issues.append(
                        {"row": row_number, "column": column, "message": "This value is required."}
                    )
            elif len(value) > STRING_LIMITS[column]:
                if len(issues) < MAX_ISSUES:
                    issues.append(
                        {"row": row_number, "column": column, "message": f"Maximum length is {STRING_LIMITS[column]} characters."}
                    )

        for column in ("email", "faculty", "programme", "semester"):
            value = record[column]
            if value is not None and len(value) > STRING_LIMITS[column]:
                if len(issues) < MAX_ISSUES:
                    issues.append(
                        {"row": row_number, "column": column, "message": f"Maximum length is {STRING_LIMITS[column]} characters."}
                    )
        email = record["email"]
        if email is not None and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            if len(issues) < MAX_ISSUES:
                issues.append({"row": row_number, "column": "email", "message": "Enter a valid email address or leave it blank."})

        for column, (minimum, maximum) in INTEGER_RULES.items():
            record[column] = to_number(
                record[column], row_number, column, issues, integer=True,
                minimum=minimum, maximum=maximum,
            )
        for column, (minimum, maximum) in DECIMAL_RULES.items():
            record[column] = to_number(
                record[column], row_number, column, issues,
                minimum=minimum, maximum=maximum,
            )

        academic_metrics = ("gpa", "assignment_average", "test_average")
        if any(record[column] is not None for column in academic_metrics) and record["academic_year"] is None:
            if len(issues) < MAX_ISSUES:
                issues.append(
                    {"row": row_number, "column": "academic_year", "message": "Required when academic results are provided."}
                )

        total_classes = record["total_classes"]
        attended_classes = record["attended_classes"]
        if (total_classes is None) != (attended_classes is None):
            missing_column = "total_classes" if total_classes is None else "attended_classes"
            if len(issues) < MAX_ISSUES:
                issues.append(
                    {"row": row_number, "column": missing_column, "message": "Provide both class counts or leave both blank."}
                )
        elif total_classes is not None and attended_classes is not None:
            if attended_classes > total_classes:
                if len(issues) < MAX_ISSUES:
                    issues.append(
                        {"row": row_number, "column": "attended_classes", "message": "Attended classes cannot exceed total classes."}
                    )
            elif record["attendance_percentage"] is None and total_classes > 0:
                record["attendance_percentage"] = round(attended_classes * 100 / total_classes, 2)

        raw_records.append(record)

    unique_records: list[dict] = []
    seen_numbers: set[str] = set()
    duplicate_rows_removed = 0
    for record in raw_records:
        student_number = record.get("student_number")
        dedupe_key = student_number.casefold() if student_number else None
        if dedupe_key and dedupe_key in seen_numbers:
            duplicate_rows_removed += 1
            continue
        if dedupe_key:
            seen_numbers.add(dedupe_key)
        unique_records.append(record)

    missing_values = missing_counts(unique_records)
    if issues:
        failure(
            "Some rows failed validation. No records were saved.",
            rows_received,
            issues,
            duplicate_rows_removed,
            missing_values,
        )
        return

    feature_columns, prepared_feature_rows, imputed_features = prepare_features(unique_records)
    records = [
        {
            "studentNumber": record["student_number"],
            "firstName": record["first_name"],
            "lastName": record["last_name"],
            "email": record["email"],
            "age": record["age"],
            "faculty": record["faculty"],
            "programme": record["programme"],
            "academicYear": record["academic_year"],
            "semester": record["semester"],
            "gpa": record["gpa"],
            "assignmentAverage": record["assignment_average"],
            "testAverage": record["test_average"],
            "attendancePercentage": record["attendance_percentage"],
            "totalClasses": record["total_classes"],
            "attendedClasses": record["attended_classes"],
            "weeklyLogins": record["weekly_logins"],
            "assignmentSubmissionRate": record["assignment_submission_rate"],
            "resourceDownloads": record["resource_downloads"],
            "discussionParticipation": record["discussion_participation"],
            "sessionDuration": record["session_duration"],
        }
        for record in unique_records
    ]
    emit(
        {
            "ok": True,
            "rowsReceived": rows_received,
            "duplicateRowsRemoved": duplicate_rows_removed,
            "missingValues": missing_values,
            "featureColumns": feature_columns,
            "preparedFeatureRows": prepared_feature_rows,
            "imputedFeatures": imputed_features,
            "records": records,
        }
    )


if __name__ == "__main__":
    main()
