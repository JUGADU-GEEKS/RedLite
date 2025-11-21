import unittest
from utils.prr_masc import prr_cycle_fixed
from core.config import LANES, DURATIONS_BY_RANK

class TestPRR(unittest.TestCase):
    def test_ranking_density(self):
        # Test that higher density gets higher rank
        density = {"north": 10, "south": 20, "east": 5, "west": 15}
        ages = {"north": 0, "south": 0, "east": 0, "west": 0}
        
        state = prr_cycle_fixed(density, ages, "test")
        priority = state["priority_order"]
        
        # Expected: south (20), west (15), north (10), east (5)
        self.assertEqual(priority, ["south", "west", "north", "east"])
        
        # Check durations
        durations = state["durations"]
        self.assertEqual(durations["south"], DURATIONS_BY_RANK[0]) # 45
        self.assertEqual(durations["west"], DURATIONS_BY_RANK[1]) # 30
        self.assertEqual(durations["north"], DURATIONS_BY_RANK[2]) # 15
        self.assertEqual(durations["east"], DURATIONS_BY_RANK[3]) # 15

    def test_tie_break_age(self):
        # Test that equal density is broken by age
        density = {"north": 10, "south": 10, "east": 5, "west": 5}
        ages = {"north": 100, "south": 50, "east": 10, "west": 20}
        
        state = prr_cycle_fixed(density, ages, "test")
        priority = state["priority_order"]
        
        # Expected: north (10, age 100), south (10, age 50), west (5, age 20), east (5, age 10)
        self.assertEqual(priority, ["north", "south", "west", "east"])

    def test_durations_mapping(self):
        density = {"north": 1, "south": 2, "east": 3, "west": 4}
        ages = {l: 0 for l in LANES}
        state = prr_cycle_fixed(density, ages, "test")
        
        durations = state["durations"]
        # Check values match config
        self.assertEqual(list(durations.values()).count(45), 1)
        self.assertEqual(list(durations.values()).count(30), 1)
        self.assertEqual(list(durations.values()).count(15), 2)

if __name__ == '__main__':
    unittest.main()
