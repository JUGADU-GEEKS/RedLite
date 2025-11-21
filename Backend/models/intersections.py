from bson import ObjectId
from pydantic import BaseModel, Field, GetJsonSchemaHandler
from typing import Optional, List, Any
from pydantic_core import core_schema

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(ObjectId),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> Any:
        return handler(core_schema.str_schema())

class IntersectionModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    intersectionId: str = Field(...)
    name: str = Field(...)
    coordinates: dict = Field(...)
    lanes: dict = Field(...)
    iotDeviceId: Optional[str] = None
    assignedEmployees: List[str] = []
    status: str = "active"
    createdAt: int = 0
    updatedAt: int = 0

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "intersectionId": "I001",
                "name": "Main St & 1st Ave",
                "coordinates": {"lat": 40.7128, "lon": -74.0060},
                "lanes": {
                    "north": "cam_north_stream_url",
                    "south": "cam_south_stream_url",
                    "east": "cam_east_stream_url",
                    "west": "cam_west_stream_url"
                },
                "iotDeviceId": "iot_device_001",
                "assignedEmployees": ["user_id_1", "user_id_2"],
                "status": "active"
            }
        }
