export class Player{
    constructor(color){
        this.color = color;

        this.knightsInHand = [];
        this.knightsOnBoard = [];

        this.citiesInHand = [];
        this.citiesOnBoard = [];

        this.villagesInhand = [];
        this.villagesOnBoard = [];

        this.strongholdsInHand = [];
        this.strongholdsOnBoard = [];
        
        this.onTurn = false;
    }

    addKnightToHand(knight){
        this.knights.push(knight);
    }

    addCityToHand(city){
        this.cities.push(city);
    }
    
    addStrongHoldToHand(stronghold){
        this.strongholds.push(stronghold);
    }

    addVillageToHand(village){
        this.villages.push(village);
    }

    removeKnightFromHand(knight){
        this.knights.splice(this.knights.indexOf(knight), 1);
    }

    removeCityFromHand(city){
        this.cities.splice(this.cities.indexOf(city), 1);
    }

    removeStrongHoldFromHand(stronghold){
        this.strongholds.splice(this.strongholds.indexOf(stronghold), 1);
    }

    removeVillageFromHand(village){
        this.villages.splice(this.villages.indexOf(village), 1);
    }

    addKnightToBoard(knight){
        this.knightsOnBoard.push(knight);
    }

    addCityToBoard(city){
        this.citiesOnBoard.push(city);
    }

    addStrongHoldToBoard(stronghold){
        this.strongholdsOnBoard.push(stronghold);
    }

    addVillageToBoard(village){
        this.villagesOnBoard.push(village);
    }

    removeKnightFromBoard(knight){
        this.knightsOnBoard.splice(this.knightsOnBoard.indexOf(knight), 1);
    }

    removeCityFromBoard(city){
        this.citiesOnBoard.splice(this.citiesOnBoard.indexOf(city), 1);
    }

    removeStrongHoldFromBoard(stronghold){
        this.strongholdsOnBoard.splice(this.strongholdsOnBoard.indexOf(stronghold), 1);
    }

    removeVillageFromBoard(village){
        this.villagesOnBoard.splice(this.villagesOnBoard.indexOf(village), 1);
    }

}