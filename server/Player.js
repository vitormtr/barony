

export class Player{
    constructor(color){
        this.color = color;
        this.onTurn = false;

        this.hexCount = {
            water: 4,
            farm: 6,
            mountain: 5, 
            plain: 6,
            forest: 6 
        };

        this.citiesOnHand = 5;
        this.strongHoldsOnHand = 5;
        this.knightsOnHand = 7;
        this.villagesOnHand = 14;
    }
}