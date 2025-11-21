import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.prr_masc import prr_cycle_fixed
from core.config import DURATIONS_BY_RANK

class TestPRRMasc(unittest.TestCase):

    def test_ranking_by_density(self):
        """Test that lanes are ranked correctly based on density."""
        density = {"north": 10, "south": 20, "east": 5, "west": 15}
        ages = {"north": 1, "south": 1, "east": 1, "west": 1}
        
        result = prr_cycle_fixed(density, ages)
        self.assertEqual(result["priority_order"], ["south", "west", "north", "east"])

    def test_tie_breaking_with_age(self):
        """Test that age is used as a tie-breaker when densities are equal."""
        density = {"north": 10, "south": 10, "east": 5, "west": 5}
        ages = {"north": 3, "south": 1, "east": 5, "west": 2}
        
        result = prr_cycle_fixed(density, ages)
        self.assertEqual(result["priority_order"], ["north", "south", "east", "west"])

    def test_durations_mapping(self):
        """Test that durations are mapped correctly based on rank."""
        density = {"north": 10, "south": 20, "east": 5, "west": 15}
        ages = {"north": 1, "south": 1, "east": 1, "west": 1}
        
        result = prr_cycle_fixed(density, ages)
        priority_order = result["priority_order"]
        durations = result["durations"]
        
        expected_durations = {
            priority_order[0]: DURATIONS_BY_RANK[0],
            priority_order[1]: DURATIONS_BY_RANK[1],
            priority_order[2]: DURATIONS_BY_RANK[2],
            priority_order[3]: DURATIONS_BY_RANK[3],
        }
        self.assertEqual(durations, expected_durations)

    def test_mixed_density_and_age(self):
        """Test a more complex scenario with mixed densities and ages."""
        density = {"north": 15, "south": 15, "east": 20, "west": 15}
        ages = {"north": 2, "south": 4, "east": 1, "west": 3}

        result = prr_cycle_fixed(density, ages)
        self.assertEqual(result["priority_order"], ["east", "south", "west", "north"])

if __name__ == '__main__':
    unittest.main()
