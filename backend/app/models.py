from pydantic import BaseModel, ConfigDict, Field, model_validator


class Card(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    details: str


class Column(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[Column]
    cards: dict[str, Card]

    @model_validator(mode="after")
    def check_referential_integrity(self) -> "BoardData":
        seen: set[str] = set()
        for column in self.columns:
            for card_id in column.cardIds:
                if card_id not in self.cards:
                    raise ValueError(
                        f"column {column.id!r} references unknown card {card_id!r}"
                    )
                if card_id in seen:
                    raise ValueError(f"card {card_id!r} appears in multiple columns")
                seen.add(card_id)
        for card_id, card in self.cards.items():
            if card.id != card_id:
                raise ValueError(
                    f"card map key {card_id!r} does not match card.id {card.id!r}"
                )
            if card_id not in seen:
                raise ValueError(f"card {card_id!r} is not in any column")
        return self


EMPTY_BOARD: BoardData = BoardData(
    columns=[
        Column(id="col-backlog", title="Backlog", cardIds=[]),
        Column(id="col-discovery", title="Discovery", cardIds=[]),
        Column(id="col-progress", title="In Progress", cardIds=[]),
        Column(id="col-review", title="Review", cardIds=[]),
        Column(id="col-done", title="Done", cardIds=[]),
    ],
    cards={},
)
