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

        this.hexCount = {
            water: 0,
            mountain: 0,
            farm: 0,
            forest: 0,
            plain: 0
        };

        this.onTurn = false;
    }

    increaseHexCount(type) {
        if (this.hexCount[type] < 5 && type === 'water') {
            this.hexCount.water++;
            return true;
        }
        if (this.hexCount[type] < 5 && type === 'mountain') {
            this.hexCount.mountain++;
            return true;
        }
        if (this.hexCount[type] < 9 && type === 'farm') {
            this.hexCount.farm++;
            return true;
        }
        if (this.hexCount[type] < 9 && type === 'forest') {
            this.hexCount.forest++;
            return true;
        }
        if (this.hexCount[type] < 8 && type === 'plain') {
            this.hexCount.plain++;
            return true;
        }
        return false;  // Retorna falso se o limite for atingido
    }

    canPlaceHex(type) {
        if (type === 'water' && this.hexCount.water < 5) return true;
        if (type === 'mountain' && this.hexCount.mountain < 5) return true;
        if (type === 'farm' && this.hexCount.farm < 9) return true;
        if (type === 'forest' && this.hexCount.forest < 9) return true;
        if (type === 'plain' && this.hexCount.plain < 8) return true;
        return false;  // Retorna falso se o jogador atingiu o limite para esse tipo
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