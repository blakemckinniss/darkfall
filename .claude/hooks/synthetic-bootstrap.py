#!/usr/bin/env python3
"""
Synthetic Bootstrap Data Generator

Generates initial calibration history for cold start scenario.
Creates 100 synthetic history entries across 4 task classes with
realistic success rates:
- Atomic: 95% success (40 entries)
- Routine: 80% success (30 entries)
- Open World: 65% success (20 entries)
- Risky: 50% success (10 entries)

Output: .claude/synthetic_history_seed.jsonl
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict


# Task class configurations
TASK_CONFIGS = [
    {
        "task_class": "atomic",
        "count": 40,
        "success_rate": 0.95,
        "p_raw_mean": 0.92,
        "p_raw_std": 0.05,
        "buckets": [
            "atomic|generic|low_novelty|internal|na",
            "atomic|python|low_novelty|internal|na",
            "atomic|javascript|low_novelty|internal|na",
        ]
    },
    {
        "task_class": "routine",
        "count": 30,
        "success_rate": 0.80,
        "p_raw_mean": 0.78,
        "p_raw_std": 0.08,
        "buckets": [
            "routine|python|medium_novelty|internal|good_tests",
            "routine|javascript|medium_novelty|internal|some_tests",
            "routine|typescript|medium_novelty|internal|good_tests",
        ]
    },
    {
        "task_class": "open_world",
        "count": 20,
        "success_rate": 0.65,
        "p_raw_mean": 0.68,
        "p_raw_std": 0.12,
        "buckets": [
            "open_world|node|high_novelty|external|weak_tests",
            "open_world|python|high_novelty|external|some_tests",
            "open_world|multi|medium_novelty|external|weak_tests",
        ]
    },
    {
        "task_class": "risky",
        "count": 10,
        "success_rate": 0.50,
        "p_raw_mean": 0.55,
        "p_raw_std": 0.15,
        "buckets": [
            "risky|multi|high_novelty|external|weak_tests",
            "risky|database|high_novelty|internal|weak_tests",
            "risky|production|high_novelty|external|na",
        ]
    }
]


def generate_synthetic_history() -> List[Dict]:
    """
    Generate 100 synthetic calibration history entries

    Returns:
        List of history entries with p_raw, p_correct_mean, outcome, bucket, etc.
    """
    random.seed(42)  # Reproducible results
    history = []

    base_time = datetime.now() - timedelta(days=30)

    for config in TASK_CONFIGS:
        task_class = config["task_class"]
        count = config["count"]
        success_rate = config["success_rate"]
        p_raw_mean = config["p_raw_mean"]
        p_raw_std = config["p_raw_std"]
        buckets = config["buckets"]

        for i in range(count):
            # Generate p_raw with Gaussian noise (clamped to [0, 1])
            p_raw = max(0.01, min(0.99, random.gauss(p_raw_mean, p_raw_std)))

            # p_correct_mean is slightly calibrated (closer to actual success rate)
            calibration_factor = 0.7  # 70% calibrated towards true rate
            p_correct_mean = p_raw * (1 - calibration_factor) + success_rate * calibration_factor
            p_correct_mean = max(0.01, min(0.99, p_correct_mean))

            # Outcome based on success rate
            outcome = random.random() < success_rate

            # Select random bucket from this task class
            bucket = random.choice(buckets)

            # Generate timestamp (spread over last 30 days)
            timestamp = base_time + timedelta(
                days=random.uniform(0, 30),
                hours=random.uniform(0, 24)
            )

            # Create history entry
            entry = {
                "timestamp": timestamp.isoformat(),
                "task_class": task_class,
                "bucket": bucket,
                "p_raw": round(p_raw, 4),
                "p_correct_mean": round(p_correct_mean, 4),
                "p_correct_low": round(p_correct_mean * 0.85, 4),  # Conservative bound
                "outcome": outcome,
                "task_summary": f"Synthetic {task_class} task #{i+1}",
                "synthetic": True
            }

            history.append(entry)

    # Sort by timestamp
    history.sort(key=lambda x: x["timestamp"])

    return history


def save_history(history: List[Dict], output_path: Path):
    """Save history to JSONL file"""
    with open(output_path, 'w') as f:
        for entry in history:
            f.write(json.dumps(entry) + '\n')


def compute_statistics(history: List[Dict]) -> Dict:
    """Compute statistics for generated history"""
    stats = {
        "total_entries": len(history),
        "by_task_class": {},
        "overall_success_rate": sum(1 for e in history if e["outcome"]) / len(history)
    }

    # Per task class stats
    for config in TASK_CONFIGS:
        task_class = config["task_class"]
        entries = [e for e in history if e["task_class"] == task_class]

        if entries:
            successes = sum(1 for e in entries if e["outcome"])
            stats["by_task_class"][task_class] = {
                "count": len(entries),
                "success_rate": successes / len(entries),
                "avg_p_raw": sum(e["p_raw"] for e in entries) / len(entries),
                "avg_p_correct_mean": sum(e["p_correct_mean"] for e in entries) / len(entries)
            }

    return stats


if __name__ == "__main__":
    print("Generating synthetic bootstrap history...\n")

    # Generate history
    history = generate_synthetic_history()

    # Compute statistics
    stats = compute_statistics(history)

    print(f"Generated {stats['total_entries']} synthetic entries")
    print(f"Overall success rate: {stats['overall_success_rate']:.1%}\n")

    print("Per Task Class Statistics:")
    print("-" * 70)
    for task_class, class_stats in stats["by_task_class"].items():
        print(f"\n{task_class.upper()}:")
        print(f"  Entries: {class_stats['count']}")
        print(f"  Success rate: {class_stats['success_rate']:.1%}")
        print(f"  Avg p_raw: {class_stats['avg_p_raw']:.3f}")
        print(f"  Avg p_correct_mean: {class_stats['avg_p_correct_mean']:.3f}")

    # Save to file
    output_path = Path(__file__).parent / "synthetic_history_seed.jsonl"
    save_history(history, output_path)

    print(f"\n✓ Synthetic history saved to: {output_path}")
    print(f"  Total size: {output_path.stat().st_size / 1024:.1f} KB")
    print("\nThis file provides initial calibration data for cold start.")
    print("Run this script to regenerate if needed.")
